import * as path from "path";

export function IsRoot(Key:string):boolean
{
    return Key === "";
}

export function IsFolder(Key:string):boolean
{
    return IsRoot(Key) || Key.endsWith("/");
}

export function IsFile(Key:string):boolean
{
    return !IsFolder(Key);
}

export function GetParentFolderKey(Key:string):string
{
    if(IsRoot(Key))
    {
        return "";
    }

    var parentDir = path.join(Key, "..");
    if(parentDir==="."){return "";}
    return parentDir + "/";
}

export function GetFullPath(Bucket:string, Key:string):string
{
    return Bucket + "/" + Key;
} 

export function GetURI(Bucket:string, Key:string):string
{
    return "s3://" + GetFullPath(Bucket, Key);
}

export function GetURL(Bucket:string, Key:string):string
{
    return "https://" + Bucket + ".s3.amazonaws.com/" + Key;
}

export function GetARN(Bucket:string, Key:string)
{
    return "arn:aws:s3:::" + GetFullPath(Bucket, Key);
}

export function GetFileNameWithExtension(Key:string | undefined)
{
    if(!Key) { return ""; }
    if(Key.endsWith("/")) { return Key; }
    if(!Key.includes("/")){ return Key; }
    return Key.split('/').pop() || "";
}

export function GetFileNameWithoutExtension(Key:string | undefined)
{
    return RemoveExtesionFromFileName(GetFileNameWithExtension(Key));
}

export function RemoveExtesionFromFileName(FileName:string):string
{
    if(!FileName) { return ""; }
    if(!FileName.includes(".")) { return FileName; }
    let extension = GetFileExtension(FileName);
    return FileName.replace("." + extension, "");
}

export function GetFileExtension(FileName:string):string
{
    if(!FileName) { return ""; }
    if(!FileName.includes(".")) { return ""; }
    let extension = FileName.split(".").pop();
    return extension?extension:"";
}

export function GetFolderName(Key:string | undefined)
{
    if(!Key) { return ""; }
    if(!Key.endsWith("/")) { return Key; }
    var path = Key.split('/');
    path.pop();
    return path.pop() || "";
}