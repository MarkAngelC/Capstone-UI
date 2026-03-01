@echo off
setlocal

echo === Success case (authorized) ===
curl -s -X POST http://localhost:3000/v1/summaries ^
  -H "Authorization: Bearer key1" ^
  -H "Content-Type: application/json" ^
  -d "{\"tenantId\":\"clinic-abc\",\"note\":{\"raw\":\"Patient reports headache for 3 days.\"},\"options\":{\"soap\":true,\"plainLanguage\":true}}"
echo.

echo === Failure case (validation) ===
curl -s -X POST http://localhost:3000/v1/summaries ^
  -H "Authorization: Bearer key1" ^
  -H "Content-Type: application/json" ^
  -d "{\"note\":{\"raw\":\"\"}}"
echo.

echo === Failure case (tenant mismatch) ===
curl -s -X POST http://localhost:3000/v1/summaries ^
  -H "Authorization: Bearer key1" ^
  -H "Content-Type: application/json" ^
  -d "{\"tenantId\":\"clinic-xyz\",\"note\":{\"raw\":\"hello\"}}"
echo.

endlocal