# Firebase Functions 全數清除與一鍵重建腳本
Write-Output "Step 1: Cleaning up ALL functions on Firebase..."
firebase functions:delete --all --force

Write-Output "Step 2: Re-deploying fresh V2 functions..."
cd functions
npm install --silent
firebase deploy --only functions --force
cd ..

Write-Output "Mission Complete: Your cloud is now clean and updated."
