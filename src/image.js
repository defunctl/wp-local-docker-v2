const commandUtils = require( './command-utils' );
const gateway = require( './gateway' );
const environment = require( './environment' );
const inquirer = require( 'inquirer' );
const promptValidators = require( './prompt-validators' );
const os = require('os');
const execSync = require('child_process').execSync;

// These have to exist, so we don't bother checking if they exist on the system first
const globalImages = [
    '10up/nginx-proxy:latest',
    'mysql:5',
    'schickling/mailcatcher',
    'phpmyadmin/phpmyadmin'
];
const images = [
    'dustinrue/wp-php-fpm-dev:7.4',
    'dustinrue/wp-php-fpm-dev:7.3',
    'dustinrue/wp-php-fpm-dev:7.2',
    'dustinrue/wp-php-fpm-dev:7.1',
    'dustinrue/wp-php-fpm-dev:7.0',
    'dustinrue/wp-php-fpm-dev:5.6',
    '10up/wpsnapshots:dev',
    'memcached:latest',
    'nginx:latest',
    'docker.elastic.co/elasticsearch/elasticsearch:5.6.16',
    'hitwe/phpmemcachedadmin'
];

const help = function() {
    let help = `
Usage: 10updocker image update

Updates any docker images used by your environment to the latest versions available for the specified tag. All environments must be stopped to update images.
`;
    console.log( help );
    process.exit();
};

const update = function( image ) {
    try { 
        execSync( `docker pull ${image}`, { stdio: 'inherit' });
    } 
    catch (ex) {

    }
    console.log();
};

const updateIfUsed = function( image ) {
    console.log( `Testing ${image}` );
    let result = execSync( `docker image ls ${image}`).toString();
    // All images say how long "ago" they were created.. Use this to determine if the image exists, since `wc -l` doesn't work on windows
    if ( result.indexOf( 'ago' ) === -1 ) {
        console.log( `${image} doesn't exist on this system. Skipping update.` );
        return;
    }

    update( image );
};

const updateAll = function() {
    globalImages.map( update );
    images.map( updateIfUsed );

    // delete the built containers on linux so it can be rebuilt with the (possibly) updated
    // phpfpm container
    if ( os.platform() == "linux" ) {
        console.log( 'Removing previously built images so they can be built again' );
        execSync( `docker image rm $(docker image ls -qf label=com.10up.wp-local-docker=user-image)` );
    }
};

const stopAll = async function() {
    await environment.stopAll();
    await gateway.stopGlobal();
}

const confirm = async function() {
    let answers = await inquirer.prompt({
        name: 'confirm',
        type: 'confirm',
        message: `Updating images requires all environments to be stopped. Is that okay?`,
        validate: promptValidators.validateNotEmpty,
        default: false,
    });

    return answers.confirm;
}

const command = async function() {
    switch ( commandUtils.subcommand() ) {
        case 'update':
            if ( await confirm() ) {
                await stopAll();
                updateAll();
                console.log( 'Finished. You can now start your environments again.' );
            }
            else {
                console.log( 'Image update canceled' );
            }
            break;
        default:
            await help();
            break;
    }
};

module.exports = { command };
