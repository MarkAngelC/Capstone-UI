@echo off
setlocal

echo === Success case ===
curl -s -X POST http://localhost:3000/v1/summaries ^
  -H "Content-Type: application/json" ^
  -d "{\"tenantId\":\"clinic-abc\",\"note\":{\"raw\":\"Patient reports headache for 3 days.\"},\"options\":{\"soap\":true,\"plainLanguage\":true}}" 
echo.

echo === Failure case ===
curl -s -X POST http://localhost:3000/v1/summaries ^
  -H "Content-Type: application/json" ^
  -d "{\"tenantId\":\"\",\"note\":{\"raw\":\"\"}}"
echo.

endlocal