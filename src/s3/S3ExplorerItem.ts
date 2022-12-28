/* eslint-disable @typescript-eslint/naming-convention */
import * as path from "path";
import * as s3_helper from './S3Helper';

export class S3ExplorerItem {

	public Bucket:string;
	public Key:string;

	constructor(Bucket:string, Key:string) {
		this.Bucket = Bucket;
		this.Key = Key;
	}

	public IsRoot():boolean
	{
		return s3_helper.IsRoot(this.Key);
	}

	public IsFile():boolean
	{
		return s3_helper.IsFile(this.Key);
	}

	public IsFolder():boolean
	{
		return s3_helper.IsFolder(this.Key);
	}
	
	public GetParentFolderKey()
	{
		return s3_helper.GetParentFolderKey(this.Key);
	}

	public GetFullPath(){
		return s3_helper.GetFullPath(this.Bucket, this.Key);
	} 

	public GetS3URI()
	{
		return s3_helper.GetURI(this.Bucket, this.Key);
	}

	public GetARN()
	{
		return s3_helper.GetARN(this.Bucket, this.Key);
	}
}
