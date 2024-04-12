require("dotenv").config();
const AWS = require("@aws-sdk/client-s3");

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEYS;
const secretAccessKey = process.env.AWS_SECRET_KEYS;

const s3 = new AWS.S3({
  region,
  accessKeyId,
  secretAccessKey,
});



// uploads a file to s3
async function uploadFile(file, name) {
  buf = Buffer.from(file.replace(/^data:image\/\w+;base64,/, ""), "base64");

  const uploadParams = {
    Bucket: bucketName,
    Body: buf,
    Key: name,
    ContentEncoding: "base64",
    ContentType: "image/jpeg",
  };
  await s3.putObject(uploadParams);
  return;
}
exports.uploadFile = uploadFile;

// downloads a file from s3
function getFileStream(fileKey) {
  const downloadParams = {
    Key: fileKey,
    Bucket: bucketName,
  };
  console.log("logs:-" + s3.getObject(downloadParams));
  return s3.getObject(downloadParams).createReadStream();
}
exports.getFileStream = getFileStream;

async function deleteFile(name) {
  var params = {
    Bucket: bucketName,
    Key: name,
  };
  await s3.deleteObject(params, function (err, data) {
    if (err) console.log(err, err.stack);
    else console.log(data);
  });
  return;
}
exports.deleteFile = deleteFile;
