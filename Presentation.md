# SLIDE 1 - INTRO

Good afternoon, everyone. Today, I would like to introduce you to three powerful extensions for Visual Studio Code that can help developers work more efficiently with Amazon Web Services (AWS): 
- the VS Code AWS Access Extension, 
- the VS Code AWS S3 Extension, 
- and the VS Code AWS CloudWatch Extension.

As you know, AWS is a popular cloud computing platform used by millions of developers around the world to build and deploy applications. However, working with AWS can sometimes be complex and time-consuming, especially when using multiple AWS services or managing multiple AWS accounts.

That's where these extensions come in. They provide a seamless integration between VS Code and AWS, enabling developers to work with AWS resources directly from within their favorite code editor. Whether you're managing AWS credentials, working with S3 buckets, or monitoring your AWS resources, these extensions can help streamline your workflow and improve your productivity.

In the next few minutes, I will provide an overview of each extension, highlighting their key features and benefits. By the end of this presentation, you will have a better understanding of how these extensions can help you work more efficiently with AWS and hopefully be inspired to give them a try. So let's get started.

# SLIDE 2 - ABOUT TEAM

ASK JORGE

# SLIDE 3 - ABOUT ME

My name is Necati ARSLAN, and I am a Data Engineer on the DataPipers team. I have been working on this team for the past 1.5 years, and during this time, I have had the opportunity to work with a wide range of AWS technologies, including S3, Cloudwatch, EMR, SNS, Lambda Functions, and DynamoDB.

As a data engineer, my role is to design and implement data pipelines that collect, store, and process data from various sources. AWS provides a rich set of services that enable us to build scalable and resilient data pipelines, and we leverage these services extensively to meet our data processing needs.

For example, we use Amazon S3 to store our raw data, Cloudwatch to monitor our AWS resources, EMR to process large datasets using Apache Spark, SNS to send notifications when important events occur, Lambda Functions to run serverless code, and DynamoDB to store NoSQL data.


# SLIDE 4 - AGENDA

The agenda for this presentation is as follows:


First, we will dive into the VS Code AWS Access Extension, which provides a simple and secure way to manage AWS credentials directly from within VS Code. I will demonstrate how to use this extension to manage AWS credentials and discuss the benefits of using it for credential management.

We will then move on to the VS Code AWS S3 Extension, which allows developers to work with Amazon S3 buckets directly from within VS Code. I will demonstrate how to use this extension to work with S3 buckets.

Finally, we will explore the VS Code AWS CloudWatch Extension, which provides real-time monitoring of AWS resources from within VS Code. 

We will conclude with a brief summary of the key points covered in the presentation and open up the floor for any questions or comments. 

So let's dive into the VS Code AWS Extensions and see how they can help improve your productivity when working with AWS resources.

# SLIDE 5 - AWS Access Intro

AWS is an incredibly powerful cloud platform with a wide range of services and features. As a data engineer on the DataPipers team, I work with many of these services every day, including S3, CloudWatch, EMR, SNS, Lambda Functions, and DynamoDB. However, one of the biggest challenges I've faced when working with AWS is managing my access credentials.

In order to access AWS services and resources from my local machine, I need to have the appropriate access credentials set up. This means creating an AWS IAM user, generating an access key and secret access key, and configuring these credentials on my local machine.

But what happens when these credentials expire? Or when I need to work with multiple AWS accounts or profiles? This is where the AWS Access extension for Visual Studio Code comes in.

This powerful extension is designed to help you test, renew, and monitor your AWS access tokens with ease. With a variety of features and a sleek, intuitive UI, you'll have all the tools you need to manage your credentials without leaving VS Code.

One of the key features of this extension is the ability to monitor your AWS credentials status with a status bar item that updates in real-time. This means you can quickly see if your credentials are valid and up-to-date, without having to manually check them.

# SLIDE 6 - AUTO REFRESH TOKEN
One of the key features of the AWS Access extension for Visual Studio Code is the ability to set your custom renewal bash script to automate the renewal process. This means you can ensure that your access tokens are always up-to-date and avoid any interruptions when working with AWS services.

But what if you have multiple AWS accounts or profiles, each with their own login command? This is where the AWS Access extension really shines. With this extension, you can set your AWS login command for each profile, and the extension will run this command automatically to renew your access token when the current token expires.

To set your AWS login command, simply open the Command Palette in VS Code (using Cmd+Shift+P on macOS or Ctrl+Shift+P on Windows and Linux), and search for "Aws Access: Set Aws Login Command". From here, you can enter your AWS login command for each profile.

Once you've set your AWS login command, the AWS Access extension will automatically run this command when your access token is about to expire, renewing your token without any intervention on your part. This means you can focus on your work without having to worry about constantly renewing your access credentials.

# SLIDE 7 - TOKEN EXPIRE TIME
As we've seen, the AWS Access extension for Visual Studio Code makes it easy to manage your AWS access credentials, including automatically renewing your access tokens when they expire.

But how do you know when your token is about to expire? That's where the token expire time feature comes in.

The AWS Access extension displays the token expire time countdown in the status bar of your VS Code window. This countdown updates in real-time, giving you a clear view of when your token is set to expire.

If you hover over the icon in the status bar, you can see additional information, including the active profile and the exact date and time when your token will expire.

And to make it even easier to switch between AWS profiles, there's a switch profile button located right next to the token expire count down text in the status bar. Simply click this button to switch to a different AWS profile, without having to open up your settings or configuration files.

Overall, the token expire time feature of the AWS Access extension provides a convenient way to stay on top of your AWS access credentials and ensure that you always have a valid access token when you need it. So give it a try and see how it can simplify your workflow when working with AWS services.

# SLIDE 8 - OTHER COMMANDS
In addition to the main features we've covered so far, the AWS Access extension also includes several other useful commands that can help you manage your AWS access credentials.

For example, you can use the "Test AWS credentials" command to quickly check if your credentials are valid and up-to-date. This command runs a simple API call to AWS using your current credentials, and lets you know if the call was successful or if there was an error.

You can also use the "Set Active User" command to specify which AWS user or role you want to use for your current VS Code session. This can be helpful if you have multiple users or roles set up in your AWS account and need to switch between them frequently.

The "List Profiles" command displays a list of all the AWS profiles that are currently configured in your local credentials file, along with the associated access keys and regions.

The "Open Config and Credentials Files" command lets you quickly open the configuration and credentials files in your default text editor, so you can make changes directly if needed.

You can also use the "Show Active AWS Credentials" command to display the currently active AWS credentials in a pop-up window, showing the access key and secret key associated with the current profile.

Finally, the "Set Login Batch Command" command allows you to specify a custom shell script that should be run automatically to renew your AWS access token when it expires. This can be especially helpful if you have a complex authentication process that requires additional steps beyond simply refreshing the access token.

Overall, these additional commands make the AWS Access extension even more powerful and flexible, providing a range of options for managing your AWS access credentials directly from within VS Code.

# SLIDE 9 - HOW TO INSTALL
If you're interested in trying out the AWS Access extension for VS Code, the good news is that it's incredibly easy to install!

You can simply go to the VS Code Extensions Marketplace and search for "AWS Access" to find the extension. From there, you can click the "Install" button to add it to your VS Code installation.

Alternatively, you can also visit the official GitHub repository for the extension, where you'll find more detailed documentation, as well as a link to download the latest release.

Either way, once you have the extension installed and set up with your AWS access credentials, you'll be able to manage your access tokens more easily and efficiently than ever before, all from within the comfort and convenience of your favorite code editor.

# SLIDE 10 - DEMO
Now that we've covered the basics of the AWS Access extension for VS Code, let's take a closer look at how it works in action.

In this demo, we'll walk through the process of setting up the extension, configuring our AWS access credentials, and then using the extension to test, monitor, and renew our access tokens as needed.

We'll also explore some of the other features of the extension, such as setting a custom renewal bash script, managing multiple profiles, and monitoring the expiration time of our access tokens.

By the end of this demo, you should have a good understanding of how the AWS Access extension can help you streamline your AWS credential management workflow and make your development process more efficient and hassle-free.

# SLIDE 11 - AWS S3 Extension Intro
New topic !!!
As a data engineer or developer working with Amazon Web Services, you likely spend a lot of time managing your S3 buckets, files, and folders. Whether you're uploading new data, accessing existing files, or deleting old resources, S3 is a critical part of many AWS workflows.

But managing S3 resources can be a complex and time-consuming process, especially if you're working with large volumes of data or multiple buckets. That's where the AWS S3 Browser extension for Visual Studio Code comes in.

With this extension, you can easily browse and manage your S3 buckets and files directly within the VS Code editor. You can upload, download, and delete files, create and delete folders, and even copy file names, keys, ARNs, URLs, and S3 URIs.

The extension also includes some convenient features like the ability to add shortcuts to frequently used files and folders, and search all buckets by file name, extension, folder, and key. And if you're working with a local environment, you can even update the AWS Endpoint to test your S3 functionality.

Whether you're a developer, data scientist, or system administrator, the AWS S3 Browser extension can save you time and simplify your S3 management workflow. Let's take a closer look at some of the key features of this powerful tool.

# SLIDE 12 - AWS S3 Buckets TreeView
The AWS S3 Browser extension provides a powerful and user-friendly interface for managing your S3 resources. One of the key features of the extension is the Buckets TreeView, which allows you to easily browse and manage your S3 buckets, files, and folders directly within Visual Studio Code.

To use the Buckets TreeView, you first need to set up your AWS credentials and set the active profile. Once you have done that, you can add your buckets to the extension and even add shortcuts to specific folders and files for easy access. All your buckets and shortcuts are listed in a treeview, making it easy to navigate and manage your S3 resources.

The Buckets TreeView also includes a favorites feature, allowing you to add specific buckets and shortcuts to a list for quick and easy access. Additionally, there is a search functionality that allows you to search for specific resources by text, further simplifying the process of finding the resource you need.

Finally, the AWS S3 Browser extension also allows you to set the AWS endpoint to use the extension with LocalStack, providing an easy way to test your S3 functionality in your local development environment.

# SLIDE - 13 AWS S3 BROWSER
The S3 Browser is the main component of the AWS S3 Browser extension for Visual Studio Code. It provides a familiar and intuitive interface for managing your S3 resources, similar to a Windows Explorer or Mac Finder. With this component, you can easily perform tasks such as uploading, downloading, and deleting files, as well as creating and deleting folders.

You can also copy file names, keys, ARNs, URLs, and S3 URIs, and add shortcuts to specific files and folders for easy access. The S3 Browser also includes a powerful search functionality that allows you to search files by file name, extension, folder, and key.

This browser is a must-have tool for anyone working with S3. It simplifies the process of managing your S3 resources and allows you to focus on what really matters - your work.

# SLIDE 14 - BROWSE A FILE

When you click on a file in the S3 Browser, you can view the file's properties such as the name, extension, folder, key, ARN, S3 URL, and URL of the file. This makes it easy to get all the necessary information about a file.

Additionally, you can download the file or delete it directly from the extension. While functions such as renaming, copying, and moving files will be added in the future, the current features already allow for efficient management of files in your S3 buckets.

# SLIDE 15 - ADVANCED SEARCH
Advanced search is a powerful feature in the AWS S3 extension that allows you to search for files and folders in a bucket by name, extension, and folder/key. This feature is particularly useful when dealing with large S3 buckets where finding a specific file or folder manually can be time-consuming and challenging. With the advanced search function, you can quickly locate the files and folders you need by entering a keyword or phrase in the search bar, and the extension will display all the results that match your search criteria. 

Additionally, you can select multiple files and folders and copy files, ARNs, S3 URLs, etc.

# SLIDE 16 - HOW TO INSTALL

You can simply go to the VS Code Extensions Marketplace and search for "AWS S3" to find the extension. From there, you can click the "Install" button to add it to your VS Code installation.

Alternatively, you can also visit the official GitHub repository for the extension, where you'll find more detailed documentation, as well as a link to download the latest release.

# SLIDE 17 - DEMO FOR AWS S3 BROWSER EXTENSION
In this demo, we will explore the features of this extension that make managing S3 resources easier and more efficient.

# SLIDE 18 - AWS CLOUD WATCH
AWS CloudWatch is a fully managed monitoring and observability service provided by Amazon Web Services (AWS). It enables you to collect and monitor log data, system-level metrics, and even set alarms based on predefined thresholds. It's a powerful tool that helps you gain insights into the performance, health, and operational aspects of your AWS resources and applications.

Now, with this extension, it is even easier and more convenient for developers like you to access and review your AWS CloudWatch logs directly within Visual Studio Code, without the need to switch to the AWS Management Console.

First, you'll find a dedicated section within VSCode where you can manage your CloudWatch logs. By clicking the 'Add Log Group' button, you can specify the log group and its associated AWS region. What's great is that you can add multiple log groups from different regions, providing you with a centralized view of all your log data in one place.

Moving on, we explore the process of adding log streams. Within the extension, there's an option to add log streams. By selecting the desired log group and specifying the log stream, you can effortlessly include multiple log streams from different log groups. This flexibility allows you to access and review logs from various sources seamlessly.

By following these simple steps, you can easily add log groups and log streams to our extension, making your CloudWatch log management more streamlined.

# SLIDE 19 - AWS CLOUD WATCH

Once you've added your log groups and log streams, you'll experience the convenience of a centralized view of all your log data. The extension loads logs faster than the AWS console, saving you time and frustration. You can now access and review your logs more efficiently.

One of the standout features of our extension is the search functionality. Within the interface, you'll find a powerful search feature that allows you to quickly find specific logs. It also provided you with options to manage your logs effectively. You can hide specific logs that are not relevant to your current analysis, allowing you to focus on what matters most. 

The extension allows you to export logs. With just a few clicks, you can export logs for further analysis or share them with your team, making collaboration and troubleshooting a breeze.

# SLIDE 20 - DEMO

In this demo, we will explore the features of this extension that makes browsing cloudwatch logs easier and more efficient.


# SLIDE 21 - HOW TO INSTALL

You can simply go to the VS Code Extensions Marketplace and search for "AWS Cloudwatch" to find the extension. From there, you can click the "Install" button to add it to your VS Code installation.

# SLIDE 22 - THANKS

In conclusion, we hope that this presentation has given you a good overview of the AWS Access and S3 Browser extensions for Visual Studio Code. These extensions can greatly improve your productivity when working with AWS resources, making it easier to manage your credentials, browse and manage your S3 buckets and files, and perform various operations on your AWS resources.

We'd like to thank you for taking the time to learn about these extensions and for considering them for your workflow. If you have any questions or feedback, please don't hesitate to reach out to us. Thank you again and happy coding!
