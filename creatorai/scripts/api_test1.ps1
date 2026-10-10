# CreatorAI API end-to-end smoke test (PowerShell) — Part 1: auth, discovery, briefs, matching
$base = "http://127.0.0.1:8000"
$script:results = @()

function Check($name, $condition, $detail = "") {
    $script:results += ("{0} {1} {2}" -f ($(if ($condition) { "[PASS]" } else { "[FAIL]" })), $name, $detail)
}
function JsonBody($obj) { $obj | ConvertTo-Json -Depth 6 }

# 1. Health
try {
    $h = Invoke-RestMethod "$base/api/health" -TimeoutSec 10
    Check "health" ($h.status -eq "ok")
} catch { Check "health" $false $_.Exception.Message }

# 2. Brand login
try {
    $brandLogin = Invoke-RestMethod -Method Post "$base/api/auth/login" -ContentType "application/json" `
        -Body (JsonBody @{ email = "demo@novamedia.test"; password = "demo12345" })
    Check "brand login" ($brandLogin.user.role -eq "brand")
    $script:brandTok = $brandLogin.access_token
} catch { Check "brand login" $false $_.Exception.Message }

# 3. Creator login
try {
    $creatorLogin = Invoke-RestMethod -Method Post "$base/api/auth/login" -ContentType "application/json" `
        -Body (JsonBody @{ email = "aria@creatorai.test"; password = "demo12345" })
    Check "creator login" ($creatorLogin.user.role -eq "creator")
    $script:creatorTok = $creatorLogin.access_token
} catch { Check "creator login" $false $_.Exception.Message }

$script:brandH = @{ Authorization = "Bearer $script:brandTok" }
$script:creatorH = @{ Authorization = "Bearer $script:creatorTok" }

# 4. Registration
try {
    $reg = Invoke-RestMethod -Method Post "$base/api/auth/register" -ContentType "application/json" `
        -Body (JsonBody @{ email = "smoketest$(Get-Random)@test.dev"; password = "password123"; full_name = "Smoke Tester"; role = "brand" })
    Check "register" ($null -ne $reg.access_token)
} catch { Check "register" $false $_.Exception.Message }

# 5. Creators list + filters
try {
    $creators = Invoke-RestMethod "$base/api/creators" -TimeoutSec 10
    Check "creators list >= 8" ($creators.Count -ge 8) "(got $($creators.Count))"
    $filtered = Invoke-RestMethod "$base/api/creators?specialty=AI+animation"
    Check "filter by specialty" ($filtered.Count -ge 2) "(got $($filtered.Count))"
    $searched = Invoke-RestMethod "$base/api/creators?q=Runway"
    Check "search q=Runway" ($searched.Count -ge 1) "(got $($searched.Count))"
} catch { Check "creators endpoints" $false $_.Exception.Message }

# 6. Shortlist (idempotent: 409 means already shortlisted by a previous run)
try {
    try {
        Invoke-RestMethod -Method Post "$base/api/shortlists" -Headers $script:brandH `
            -ContentType "application/json" -Body (JsonBody @{ creator_id = 3 }) | Out-Null
    } catch {
        if ($_.Exception.Response.StatusCode.value__ -ne 409) { throw }
    }
    $sl = Invoke-RestMethod "$base/api/shortlists" -Headers $script:brandH
    Check "shortlist add+list" ($sl.Count -ge 1) "(count $($sl.Count))"
} catch { Check "shortlist add+list" $false $_.Exception.Message }

# 7. Brief CRUD
try {
    $script:brief = Invoke-RestMethod -Method Post "$base/api/briefs" -Headers $script:brandH `
        -ContentType "application/json" -Body (JsonBody @{
            title = "Smoke Test Campaign"; objective = "Test objective for automated smoke test run"
            audience = "Testers"; content_type = "AI film"; preferred_style = "Cinematic"
            required_skills = @("AI filmmaking"); required_tools = @("Runway")
            budget_min = 3000; budget_max = 9000; deadline = "2026-12-01"
            deliverables = "1 x 30s film"; usage_rights = "3-month organic social"; status = "published"
        })
    Check "brief create" ($script:brief.id -gt 0) "(id $($script:brief.id))"
    $mine = Invoke-RestMethod "$base/api/briefs?mine=true" -Headers $script:brandH
    Check "brief list mine" ($mine.Count -ge 1) "(count $($mine.Count))"
} catch { Check "brief endpoints" $false $_.Exception.Message }

# 8. Generate brief (template engine)
try {
    $gen = Invoke-RestMethod -Method Post "$base/api/briefs/generate" -Headers $script:brandH `
        -ContentType "application/json" -Body (JsonBody @{ idea = "A cinematic launch film for our new electric scooter brand" })
    Check "generate brief" (($gen.content_type -eq "AI film") -and ($gen.title.Length -gt 3)) "-> $($gen.content_type)"
} catch { Check "generate brief" $false $_.Exception.Message }

# 9. Matches (explainable, weighted)
try {
    $matches = Invoke-RestMethod "$base/api/matches/$($script:brief.id)" -Headers $script:brandH
    $top = $matches.results[0]
    Check "matches ranked" ($matches.results.Count -ge 8) "(count $($matches.results.Count))"
    Check "match score in 0..100" (($top.match_score -ge 0) -and ($top.match_score -le 100)) "= $($top.match_score)"
    Check "5 score components" ($top.components.Count -eq 5)
    Check "reasons present" ($top.reasons.Count -ge 1)
    $wsum = 0.0; foreach ($c in $top.components) { $wsum += $c.weight }
    Check "weights sum to 1.0" ([math]::Abs($wsum - 1.0) -lt 0.001) "= $wsum"
} catch { Check "matches endpoint" $false $_.Exception.Message }

# Export state for part 2
$state = @{ briefId = $script:brief.id; brandTok = $script:brandTok; creatorTok = $script:creatorTok }
$state | ConvertTo-Json | Set-Content -Path "$PSScriptRoot\test_state.json" -Encoding utf8

$script:results | ForEach-Object { Write-Output $_ }
Write-Output "PART1 TOTAL: $($script:results.Count) FAILED: $(($script:results | Where-Object { $_ -like '*FAIL*' }).Count)"
