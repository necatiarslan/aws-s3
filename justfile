install_vsce: 
    npm install -g vsce

build:
    vsce package
    mv *.vsix ./vsix/

publish:
    vsce publish

npm_outdated:
    npm outdated
    npx npm-check-updates

npm_update:
    npm update # update node_nodules and package-lock.json
    # these will not update packages in your package.json file

npm_reinstall:
    brew upgrade # upgrade homebrew
    brew install node # install the latest node version
    npm install -g npm@latest # upgrade to the latest version
    nvm alias default node # set the default node version
    nvm install node # install the latest node version

npm_doctor:
    node -v
    npm -v
    tsc -v
    npm doctor
    npm prune # remove unused dependencies
    npx depcheck # check dependencies
    npm-check # check dependencies
    
npm-install:
    rm -rf node_modules package-lock.json
    npm install
    npx tsc --noEmit

npm_rebuild:
    rm -rf node_modules
    npm install

localstack_start:
    localstack start

localstack_stop:
    localstack stop

localstack_status:
    localstack status

localstack_logs:
    localstack logs

localstack_help:
    localstack --help 

localstack_update:
    localstack update

create_bucket:
    aws --endpoint-url=http://localhost:4566 s3 mb s3://my-bucket

list_buckets:
    aws --endpoint-url=http://localhost:4566 s3 ls

list_bucket_content:
    aws --endpoint-url=http://localhost:4566 s3 ls s3://my-bucket

upload_file:
    aws --endpoint-url=http://localhost:4566 s3 cp README.md s3://my-bucket