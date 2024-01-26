export interface ProfileConfig {
    filterString:string,
    addressing_style:boolean,
    awsProfile:string|undefined,
    awsEndPoint:string|undefined,
    bucketList:string[]|undefined,
    shortcutList:[[string,string]]|undefined,
}

export class ProfileConfigRepository {
    private static instance: ProfileConfigRepository;
    private configs: ProfileConfig[] =[];
    private constructor() {}
    public static getInstance(): ProfileConfigRepository {
        if (!ProfileConfigRepository.instance) {
            ProfileConfigRepository.instance = new ProfileConfigRepository();
        }
        return ProfileConfigRepository.instance;
    }
    public getProfileConfig(awsprofile?:string): ProfileConfig {
        var retConfig=undefined;
        if(awsprofile)
        {
            this.configs.forEach((config)=>{
                if(config.awsProfile===awsprofile)
                {
                    retConfig=config;
                    return;
                }
            });
        }
        if(!retConfig) 
        {
            retConfig={
                filterString:"",
                addressing_style:false,
                awsProfile:undefined,
                awsEndPoint:undefined,
                bucketList:undefined,
                shortcutList:undefined,
            }
        }
        return retConfig;
    }

    public setProfileConfig(config: ProfileConfig): void {
        console.log(config);
        if(config.awsProfile)
        {
            var needNewConfig=true;
            this.configs.forEach((conf)=>{
                if(conf.awsProfile===config.awsProfile)
                {
                    conf=config;
                    needNewConfig=false;
                    console.log("profile config updated");
                    return;
                }
            });
            if(needNewConfig)
            {
                this.configs.push(config);
                console.log("profile config added");
            }
        }
        else
        {
            console.log("awsProfile is undefined");
        }
    }

    public getProfileConfigList(): ProfileConfig[] {
        return this.configs;
    }

    public serialize(): string {
        return JSON.stringify(this.configs);
    }

    public deserialize(configs: string): void {
        this.configs = JSON.parse(configs);
    }
}