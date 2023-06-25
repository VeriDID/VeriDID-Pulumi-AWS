import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export function createCognitoUserPool(name: string) {
    const userPool = new aws.cognito.UserPool(name, {
        name: "veridid-pulumi-user",
        usernameAttributes: ["email"],
        schemas: [{
            attributeDataType: "String",
            mutable: false,
            name: "email",
            required: true,
        }],
    
    });

    const userAdminNas = new aws.cognito.User("admin-nas", {
        userPoolId: userPool.id,
        username: "nas@verid.id",
        attributes: {
            email: "nas@verid.id",
        },
        password: "yourTempPassword123!",
        messageAction: "SUPPRESS"
    });

    const userNas = new aws.cognito.User("user-nas", {
        userPoolId: userPool.id,
        username: "nas@canacred.ca",
        attributes: {
            email: "nas@canacred.ca",
        },
        password: "yourTempPassword123!",
        messageAction: "SUPPRESS"
    });

    return { userPool, userAdminNas, userNas };
}
