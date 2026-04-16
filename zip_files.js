const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

const output = fs.createWriteStream(path.join(__dirname, 'Klonosai_Update_Backup.zip'));
const archive = archiver('zip', { zlib: { level: 9 } });

output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');
  console.log('Archiver has been finalized and the output file descriptor has closed.');
});

archive.on('error', function(err) {
  throw err;
});

archive.pipe(output);

// Exclude node_modules, dist, build, and hidden folders
archive.glob('**/*', {
  ignore: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/static-build/**', '**/.git/**', '**/artifacts/mockup-sandbox/**']
});

archive.finalize();
