# CreatorAI API end-to-end smoke test (PowerShell) — Part 3: milestones, uploads, reviews, guards
$base = "http://127.0.0.1:8000"
$script:results = @()

function Check($name, $condition, $detail = "") {
    $script:results += ("{0} {1} {2}" -f ($(if ($condition) { "[PASS]" } else { "[FAIL]" })), $name, $detail)
}
function JsonBody($obj) { $obj | ConvertTo-Json -Depth 6 }

$state = Get-Content "$PSScriptRoot\test_state.json" -Raw | ConvertFrom-Json
$brandH = @{ Authorization = "Bearer $($state.brandTok)" }
$creatorH = @{ Authorization = "Bearer $($state.creatorTok)" }
$projId = $state.projId

# 18. Milestones create + update
try {
    $ms = Invoke-RestMethod -Method Post "$base/api/projects/$projId/milestones" -Headers $brandH `
        -ContentType "application/json" -Body (JsonBody @{ title = "Final handoff"; due_date = "2026-11-30" })
    $ms2 = Invoke-RestMethod -Method Patch "$base/api/milestones/$($ms.id)" -Headers $brandH `
        -ContentType "application/json" -Body (JsonBody @{ status = "completed" })
    Check "milestone create+update" ($ms2.status -eq "completed")
} catch { Check "milestones" $false $_.Exception.Message }

# 19. Deliverable upload + approve + download (curl.exe for multipart; PS 5.1 has no -Form)
try {
    $tmpFile = Join-Path $env:TEMP "creatorai_smoke.txt"
    "Smoke test deliverable content" | Set-Content -Path $tmpFile -Encoding utf8
    $upJson = & curl.exe -s -X POST "http://127.0.0.1:8000/api/projects/$projId/deliverables" `
        -H "Authorization: Bearer $($state.creatorTok)" `
        -F "title=Smoke deliverable" -F "file=@$tmpFile"
    $dl = $upJson | ConvertFrom-Json
    Check "deliverable upload" ($dl.id -gt 0) "(id $($dl.id))"
    $rev = Invoke-RestMethod -Method Post "$base/api/deliverables/$($dl.id)/review" -Headers $brandH `
        -ContentType "application/json" -Body (JsonBody @{ action = "approve"; notes = "Great work" })
    Check "deliverable approve" ($rev.status -eq "approved")
    $fileOk = Invoke-WebRequest "$base/api/files/$($dl.file_name)" -TimeoutSec 10 -UseBasicParsing
    Check "file download" ($fileOk.StatusCode -eq 200)
} catch { Check "deliverable flow" $false $_.Exception.Message }

# 19b. Dangerous file extension rejected
try {
    $badFile = Join-Path $env:TEMP "creatorai_evil.exe"
    "MZ fake" | Set-Content -Path $badFile -Encoding utf8
    $badJson = & curl.exe -s -X POST "http://127.0.0.1:8000/api/projects/$projId/deliverables" `
        -H "Authorization: Bearer $($state.creatorTok)" `
        -F "title=Evil" -F "file=@$badFile" -w "|%{http_code}"
    Check "unsafe extension blocked" ($badJson -like "*415*") "-> $badJson"
} catch {
    Check "unsafe extension blocked" $false $_.Exception.Message
}

# 20. Brand delivers the approved work, then reviews it
try {
    $del = Invoke-RestMethod -Method Post "$base/api/projects/$projId/status" -Headers $brandH `
        -ContentType "application/json" -Body (JsonBody @{ status = "delivered"; note = "Final files handed over" })
    Check "brand marks delivered" ($del.status -eq "delivered")
    $rv = Invoke-RestMethod -Method Post "$base/api/projects/$projId/review" -Headers $brandH `
        -ContentType "application/json" -Body (JsonBody @{ rating = 5; comment = "Excellent work on the smoke test." })
    Check "project review" ($rv.review_count -ge 1) "-> rating $($rv.creator_rating)"
} catch { Check "deliver+review" $false $_.Exception.Message }

# 21. Role guard: creator cannot create briefs
try {
    Invoke-RestMethod -Method Post "$base/api/briefs" -Headers $creatorH -ContentType "application/json" `
        -Body (JsonBody @{ title = "Unauthorized brief attempt"; status = "draft" }) | Out-Null
    Check "role guard creator-brief-403" $false "(succeeded)"
} catch {
    Check "role guard creator-brief-403" ($_.Exception.Response.StatusCode.value__ -eq 403)
}

# 22. Auth guard: anonymous 401
try {
    Invoke-RestMethod "$base/api/shortlists" | Out-Null
    Check "auth guard 401" $false "(succeeded)"
} catch {
    Check "auth guard 401" ($_.Exception.Response.StatusCode.value__ -eq 401)
}

# 23. Seeded data visible (persistence)
try {
    $pub = Invoke-RestMethod "$base/api/briefs" -Headers $brandH
    Check "seeded briefs visible" ($pub.Count -ge 3) "(count $($pub.Count))"
    $detail = Invoke-RestMethod "$base/api/projects/$projId" -Headers $brandH
    Check "project detail has milestones+deliverables+review" `
        (($detail.milestones.Count -ge 1) -and ($detail.deliverables.Count -ge 1) -and ($null -ne $detail.review))
} catch { Check "seeded data visible" $false $_.Exception.Message }

# 24. CORS preflight from Vite origin
try {
    $cors = Invoke-WebRequest -Method Options "$base/api/health" -UseBasicParsing `
        -Headers @{ "Origin" = "http://localhost:5173"; "Access-Control-Request-Method" = "GET" } -TimeoutSec 10
    $allow = $cors.Headers["Access-Control-Allow-Origin"]
    Check "CORS allows :5173" ($allow -eq "http://localhost:5173") "-> $allow"
} catch { Check "CORS allows :5173" $false $_.Exception.Message }

$script:results | ForEach-Object { Write-Output $_ }
Write-Output "PART3 TOTAL: $($script:results.Count) FAILED: $(($script:results | Where-Object { $_ -like '*FAIL*' }).Count)"
