import AWS from 'aws-sdk';

import { ServiceException } from '@smithy/smithy-client';
import { CloudWatch, PutMetricAlarmCommandInput } from '@aws-sdk/client-cloudwatch';

import {
    DescribeInstancesCommandInput,
    DescribeInstancesCommandOutput,
    EC2,
    RunInstancesCommandInput,
    RunInstancesCommandOutput,
    waitUntilInstanceRunning,
} from '@aws-sdk/client-ec2';

import { SSM } from '@aws-sdk/client-ssm';

import { awsConfig } from '../config/config'
import { PromiseResult } from 'aws-sdk/lib/request'
import { WaiterConfiguration } from 'aws-sdk/lib/service'

AWS.config.update(awsConfig)

const ec2 = new EC2()
const cw = new CloudWatch()
const ssm = new SSM()

export const addAlarm = (data: DescribeInstancesCommandOutput) => {
    if (!data.Reservations) throw new Error("No reservations")
    if (!data.Reservations[0].Instances) throw new Error("No instances")
    if (!data.Reservations[0].Instances[0].InstanceId) throw new Error("No instance id")
    const alarm: PutMetricAlarmCommandInput = {
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
    return cw.putMetricAlarm(alarm);
}

export const awaitInstance = (reservation: RunInstancesCommandOutput) => {
    if (!reservation.Instances) throw new Error("No instances")
    if (!reservation.Instances[0].InstanceId) throw new Error("No instance id")
    const targets: DescribeInstancesCommandInput & { $waiter?: WaiterConfiguration } = {
        InstanceIds: [
            reservation.Instances[0].InstanceId
        ]
    }
    return waitUntilInstanceRunning({
        client: ec2,
        maxWaitTime: 200
    }, targets);
}

export const describe = () => {
    const targets = {
        Filters: [
            {
                Name: 'tag:Name',
                Values: ['Beans']
            }
        ]
    }
    return ec2.describeInstances(targets);
}

export const flattenResToId = (data: DescribeInstancesCommandOutput): string[] => {
    if (!data.Reservations) throw new Error("No reservations")
    return data.Reservations.reduce((list: string[], reserved) => {
        if (!reserved.Instances) throw new Error("No instances")
        reserved.Instances.forEach(i => {
            if (!i.InstanceId) throw new Error("No instance id")
            list.push(i.InstanceId)
        })
        return list
    }, [])
}

export const formatDescription = (data: PromiseResult<DescribeInstancesCommandOutput, ServiceException>) => {
    if (!data.Reservations) throw new Error("No reservations")
    return data.Reservations.reduce((s, res) => {
        if (!res.Instances) throw new Error("No instances")
        res.Instances.forEach(i => {
            if (!i.InstanceId) throw new Error("No instance id")
            if (!i.PublicIpAddress) throw new Error("No public ip")
            if (!i.State) throw new Error("No state")
            s += `  ${i.InstanceId} | ${i.PublicIpAddress} | ${i.State.Name}\n`
        })
        return s
    }, `There are ${data.Reservations.length} Instances:\n`)
}

export const instantiate = (launchCommand: string) => {
    const instanceParams : RunInstancesCommandInput = {
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

    return ec2.runInstances(instanceParams);
}

export const pauseFor = (t: number) => new Promise(res => setTimeout(res, t * 1000))

export const shutDown = (instances: string[]) => ec2.terminateInstances({ InstanceIds: instances })

export const triggerSave = () => {
    const parameters = {
        DocumentName: 'save-beans-minecraft-world',
        Targets: [
            {
                Key: 'tag:Name',
                Values: ['Beans']
            }
        ]
    }
    return ssm.sendCommand(parameters);
}

