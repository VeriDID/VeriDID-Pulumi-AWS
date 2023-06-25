import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export function createVpcLinkSecurityGroup(name: string, vpcId: pulumi.Input<string>) {
    const sgName = `${name}-sg`;

    // Create Security Group with outbound rules
    const securityGroup = new aws.ec2.SecurityGroup(sgName, {
        vpcId: vpcId,
        description: "Security Group for VPC Link",
        tags: {
            "Name": sgName,
        },
        egress: [{
            protocol: "-1",
            fromPort: 0,
            toPort: 0,
            cidrBlocks: ["0.0.0.0/0"],
        }]
    });

    return {
        securityGroupId: securityGroup.id,
    }
}
