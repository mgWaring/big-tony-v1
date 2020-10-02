const awsConfig = {
    secretAccessKey: process.env.AWS_SECRET,
    accessKeyId: process.env.KEY_ID,
    region: "eu-west-2",
    apiVersions: {
        ec2: "2016-11-15",
        cloudwatch: "2010-08-01",
        ssm: "2014-11-06"
    }
}

const tonyConfig = {
    token: process.env.TOKEN
}

module.exports = { 
    awsConfig, 
    tonyConfig 
};