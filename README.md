# Aws S3 

![screenshoot](media/psc-main-screen.png)

The AWS S3 Browser extension for Visual Studio Code allows users to easily browse and manage their Amazon S3 buckets, files and folders within the vscode editor.

With this extension, users can perform a variety of tasks such as 
- Uploading, downloading and deleting files
- Creating and deleting folders
- Copying file names, keys, ARNs, URLs and S3 URIs
- Adding shortcuts to files and folders for easy to access
- Searching All Bucket by File Name, Extension, Folder and Key
- Updating AWS EndPoint (to test your S3 functionality in your localstash environment)

The AWS S3 Browser extension is a useful tool for anyone working with S3, whether you are a developer, data scientist, or system administrator. \
It provides an intuitive and user-friendly interface for managing S3 resources.

## Survey
Please take this survey to help me make the extension better.\
https://bit.ly/s3-extension-survey

## Search
![screenshoot](media/psc-search.png)

## Buckets & Shortcuts
![screenshoot](media/psc-treeview.png)

## File
![screenshoot](media/psc-file.png)

## Folder
![screenshoot](media/psc-empty-folder.png)

## Global Search
![screenshoot](media/psc-global-search.png)

## Edit Menu
![screenshoot](media/psc-edit-combo.png)

## Copy Menu
![screenshoot](media/psc-copy-combo.png)

## Endpoint Url
![screenshoot](media/endpoint_url.png)

## Aws Credentials Setup
To Access Aws, you need to configure aws credentials. 

For more detail on aws credentials \
https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html \
https://www.youtube.com/watch?v=SON8sY1iOBU

## Bug Report
To report your bugs or request new features, use link below\
https://github.com/necatiarslan/aws-s3/issues/new


## Todo
- Rename a Folder even file exists in it
- Bug: when you delete a folder with files in it, the folder is not deleted, only the files are deleted
- IAM Role Credentials support https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-role.html
- (node:59796) NOTE: The AWS SDK for JavaScript (v2) is in maintenance mode.
SDK releases are limited to address critical bug fixes and security issues only.
Please migrate your code to use AWS SDK for JavaScript (v3).
For more information, check the blog post at https://a.co/cUPnyil
(Use `Code Helper (Plugin) --trace-warnings ...` to show where the warning was created)
- Sunsetting the Webview UI Toolkit, migrate to alternative
    - https://vscode-elements.github.io/
    - https://github.com/microsoft/fast
    - https://code.visualstudio.com/docs/nodejs/vuejs-tutorial
- NoSuchBucket: The specified bucket does not exist handle error and show error message
## Nice To Have
- Paging (now max 1000)
- Sort By Name / Type
- Write Selected File and Folder count to the bottom
- Drag/Drop files and folders to upload
- Filter by Date/Size
- Multiple S3 Explorer
- Highlight Icons On Hover
- Show progressbar when uploading, downloading, deleting etc
- Freeze top bar
- Fix: Cannot read properties of null (reading '_panel')
- S3.getBucketAcl to get permissions and enable/disable command buttons
- Local folder sync

Follow me on linkedin to get latest news \
https://www.linkedin.com/in/necati-arslan/

Thanks, \
Necati ARSLAN \
necatia@gmail.com


Other Extensions
- https://bit.ly/aws-access-vscode-extension
- https://bit.ly/vscode-aws-s3
- https://bit.ly/aws-cloudwatch-vscode-extension
- https://bit.ly/airflow-vscode-extension