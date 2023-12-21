export const awsConfig = {
    secretAccessKey: process.env.AWS_SECRET,
    accessKeyId: process.env.KEY_ID,
    region: "eu-west-2",
    apiVersions: {
        ec2: "2016-11-15",
        cloudwatch: "2010-08-01",
        ssm: "2014-11-06"
    }
}

export const tonyConfig = {
    token: process.env.TOKEN,
}

export default { 
    awsConfig, 
    tonyConfig 
};

export const minecraftVariables = {
    "EULA": "TRUE",
    "WORLD": "/worlds/Beans.zip"
}