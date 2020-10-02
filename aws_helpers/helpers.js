const AWS = require('aws-sdk')

AWS.config.loadFromPath('./spare/aws.json')

const ec2 = new AWS.EC2()
const cw = new AWS.CloudWatch()
const ssm = new AWS.SSM()

const addAlarm = (data) => {
    const alarm = {
        AlarmName: "beans-has-no-friends",
        ComparisonOperator: 'LessThanThreshold',
        EvaluationPeriods: 5,
        MetricName: 'NetworkOut',
        Namespace: 'AWS/EC2',
        Period: 120,
        Statistic: 'Average',
        Threshold: 20000,
        ActionsEnabled: true,
        AlarmActions: ['arn:aws:automate:eu-west-2:ec2:terminate'],
        AlarmDescription: 'Terminate when not in use',
        Dimensions: [
            {
                Name: "InstanceId",
                Value: data.Reservations[0].Instances[0].InstanceId
            }
        ]
    }
    return cw.putMetricAlarm(alarm).promise()
}

const awaitStatus = (data) => {
    const targets = {
        InstanceIds: [
            data.Instances[0].InstanceId
        ]
    }
    return ec2.waitFor('instanceRunning', targets).promise()
}

const describe = () => {
    const targets = {
        Filters: [
            {
                Name: 'tag:Name',
                Values: ['Beans']
            }
        ]
    }
    return ec2.describeInstances(targets).promise()
}

const flattenResToId = (data) => {
    return data.Reservations.reduce((list, reserved) => {
        reserved.Instances.forEach(i => list.push(i.InstanceId))
        return list
    }, [])
}

const formatDescription = (data) => {
    return data.Reservations.reduce((s, res) => {
        res.Instances.forEach(i => s += `  ${i.InstanceId} | ${i.PublicIpAddress} | ${i.State.Name}\n`)
        return s
    }, `There are ${data.Reservations.length} Instances:\n`)
}

const instantiate = (launchCommand) => {
    const instanceParams = {
        ImageId: 'ami-0a669382ea0feb73a',
        InstanceType: 't3a.small',
        KeyName: 'default',
        MinCount: 1,
        MaxCount: 1,
        UserData: Buffer.from(launchCommand).toString('base64'),
        SecurityGroupIds: ['sg-0aa835dcbb76a6832'],
        IamInstanceProfile: { Arn: 'arn:aws:iam::772276857574:instance-profile/beans-bucket' },
        TagSpecifications: [
            {
                ResourceType: "instance",
                Tags: [
                    {
                        Key: "Name",
                        Value: "Beans"
                    }
                ]
            }
        ]
    }

    return ec2.runInstances(instanceParams).promise()
}

const pauseFor = (t) => new Promise(res => setTimeout(res, t * 1000))

const shutDown = (instances) => ec2.terminateInstances({ InstanceIds: instances }).promise()

const triggerSave = () => {
    const parameters = {
        DocumentName: 'save-beans-minecraft-world',
        Targets: [
            {
                Key: 'tag:Name',
                Values: ['Beans']
            }
        ]
    }
    return ssm.sendCommand(parameters).promise()
}

module.exports = {
    addAlarm,
    awaitStatus,
    describe,
    flattenResToId,
    formatDescription,
    instantiate,
    pauseFor,
    shutDown,
    triggerSave
}

