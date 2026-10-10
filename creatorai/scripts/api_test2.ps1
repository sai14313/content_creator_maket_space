# CreatorAI API end-to-end smoke test (PowerShell) — Part 2: full workflow, uploads, guards
$base = "http://127.0.0.1:8000"
$script:results = @()

function Check($name, $condition, $detail = "") {
    $script:results += ("{0} {1} {2}" -f ($(if ($condition) { "[PASS]" } else { "[FAIL]" })), $name, $detail)
}
function JsonBody($obj) { $obj | ConvertTo-Json -Depth 6 }

$state = Get-Content "$PSScriptRoot\test_state.json" -Raw | ConvertFrom-Json
$brandH = @{ Authorization = "Bearer $($state.brandTok)" }
$creatorH = @{ Authorization = "Bearer $($state.creatorTok)" }
$briefId = $state.briefId

# 10. Invitation: brand invites Aria (creator_id=1)
try {
    $inv = Invoke-RestMethod -Method Post "$base/api/invitations" -Headers $brandH `
        -ContentType "application/json" -Body (JsonBody @{ brief_id = $briefId; creator_id = 1; message = "Join our smoke test campaign!" })
    Check "invitation create" ($inv.status -eq "sent") "(id $($inv.id))"
    $projId = $inv.project_id
} catch { Check "invitation create" $false $_.Exception.Message }

# 11. Creator sees + accepts invitation
try {
    $myInvs = Invoke-RestMethod "$base/api/invitations" -Headers $creatorH
    Check "creator sees invitation" ($myInvs.Count -ge 1) "(count $($myInvs.Count))"
    $acc = Invoke-RestMethod -Method Post "$base/api/invitations/$($inv.id)/respond" -Headers $creatorH `
        -ContentType "application/json" -Body (JsonBody @{ action = "accept" })
    Check "invitation accept" ($acc.status -eq "accepted")
} catch { Check "invitation accept" $false $_.Exception.Message }

# 12. Proposal
try {
    $prop = Invoke-RestMethod -Method Post "$base/api/proposals" -Headers $creatorH `
        -ContentType "application/json" -Body (JsonBody @{
            project_id = $projId; cover_letter = "We would love to produce this campaign with our AI pipeline."
            proposed_budget = 7500; timeline_days = 20
        })
    Check "proposal create" ($prop.status -eq "submitted") "(id $($prop.id))"
} catch { Check "proposal create" $false $_.Exception.Message }

# 13. Brand accepts proposal -> in_production
try {
    $dec = Invoke-RestMethod -Method Post "$base/api/proposals/$($prop.id)/decision" -Headers $brandH `
        -ContentType "application/json" -Body (JsonBody @{ action = "accept" })
    Check "proposal accept" ($dec.status -eq "accepted")
    $proj = Invoke-RestMethod "$base/api/projects/$projId" -Headers $brandH
    Check "project in_production" ($proj.status -eq "in_production") "-> $($proj.status)"
} catch { Check "proposal accept" $false $_.Exception.Message }

# 14-15. in_production -> in_review -> revision_requested
try {
    $st = Invoke-RestMethod -Method Post "$base/api/projects/$projId/status" -Headers $creatorH `
        -ContentType "application/json" -Body (JsonBody @{ status = "in_review"; note = "First cut ready" })
    Check "creator submit for review" ($st.status -eq "in_review")
    $st = Invoke-RestMethod -Method Post "$base/api/projects/$projId/status" -Headers $brandH `
        -ContentType "application/json" -Body (JsonBody @{ status = "revision_requested"; note = "Warmer grade please" })
    Check "brand request revision" ($st.status -eq "revision_requested")
} catch { Check "review/revision transitions" $false $_.Exception.Message }

# 16. Invalid transition blocked (brand tries revision_requested -> approved)
try {
    Invoke-RestMethod -Method Post "$base/api/projects/$projId/status" -Headers $brandH `
        -ContentType "application/json" -Body (JsonBody @{ status = "approved"; note = "skip" }) | Out-Null
    Check "invalid transition blocked" $false "(succeeded but should fail)"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Check "invalid transition blocked" ($code -eq 400) "-> HTTP $code"
}

# 17. Workflow to 'approved' (part 3 continues: upload → deliver → review)
try {
    Invoke-RestMethod -Method Post "$base/api/projects/$projId/status" -Headers $creatorH `
        -ContentType "application/json" -Body (JsonBody @{ status = "in_production"; note = "Regrading" }) | Out-Null
    Invoke-RestMethod -Method Post "$base/api/projects/$projId/status" -Headers $creatorH `
        -ContentType "application/json" -Body (JsonBody @{ status = "in_review"; note = "v2 ready" }) | Out-Null
    $final = Invoke-RestMethod -Method Post "$base/api/projects/$projId/status" -Headers $brandH `
        -ContentType "application/json" -Body (JsonBody @{ status = "approved"; note = "LGTM" })
    Check "full workflow to approved" ($final.status -eq "approved")
    Check "event history recorded" ($final.events.Count -ge 5) "(events $($final.events.Count))"
} catch { Check "full workflow to approved" $false $_.Exception.Message }

$state | Add-Member -NotePropertyName projId -NotePropertyValue $projId -Force
$state | ConvertTo-Json | Set-Content -Path "$PSScriptRoot\test_state.json" -Encoding utf8

$script:results | ForEach-Object { Write-Output $_ }
Write-Output "PART2 TOTAL: $($script:results.Count) FAILED: $(($script:results | Where-Object { $_ -like '*FAIL*' }).Count)"
