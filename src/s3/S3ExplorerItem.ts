/* eslint-disable @typescript-eslint/naming-convention */
import * as path from "path";

export class S3ExplorerItem {

	public Bucket:string;
	public Key:string;

	constructor(Bucket:string, Key:string) {
		this.Bucket = Bucket;
		this.Key = Key;
	}

	public IsRoot():boolean
	{
		return this.Key === "";
	}

	public IsFile():boolean
	{
		return this.Key.includes(".");
	}

	public IsFolder():boolean
	{
		return this.IsRoot() || this.Key.endsWith("/");
	}
	
	public GetParentFolder(){
		if(this.IsRoot())
		{
			return "";
		}

		var parentDir = path.join(this.Key, "..");
		if(parentDir="."){parentDir="";}
		return parentDir;
	}

	public GetFullPath(){
		return this.Bucket + "/" + this.Key;
	} 

	public GetS3Uri()
	{
		return "s3://" + this.GetFullPath();
	}

	public GetArn()
	{
		return "arn:aws:s3:::" + this.GetFullPath();
	}
}
