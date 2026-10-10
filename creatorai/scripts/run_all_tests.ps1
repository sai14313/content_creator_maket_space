# Runs the complete CreatorAI API smoke suite in order (fresh state each run).
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
Remove-Item "$PSScriptRoot\test_state.json" -ErrorAction SilentlyContinue
& "$PSScriptRoot\api_test1.ps1"
& "$PSScriptRoot\api_test2.ps1"
& "$PSScriptRoot\api_test3.ps1"
Write-Output "SUITE COMPLETE"
