Set-Location -Path "c:\CODINGAN\web-bengkel\web-garage"
& "C:\Program Files\Git\cmd\git.exe" init
& "C:\Program Files\Git\cmd\git.exe" config user.email "admin@egagarage.com"
& "C:\Program Files\Git\cmd\git.exe" config user.name "Admin EGA GARAGE"
& "C:\Program Files\Git\cmd\git.exe" add .
& "C:\Program Files\Git\cmd\git.exe" commit -m "Initial commit for EGA GARAGE"
& "C:\Program Files\Git\cmd\git.exe" branch -M main
# Try to remove remote origin if already exists
try {
    & "C:\Program Files\Git\cmd\git.exe" remote remove origin
} catch {}
& "C:\Program Files\Git\cmd\git.exe" remote add origin https://github.com/dewasatria11/web-bengkel-customer.git
Write-Output "Git configured and committed. Attempting push..."
& "C:\Program Files\Git\cmd\git.exe" push -u origin main --force