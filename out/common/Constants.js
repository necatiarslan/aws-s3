"use strict";
/**
 * Application Constants
 *
 * Centralized location for all magic numbers and strings
 *
 * @module Constants
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONFIRMATIONS = exports.WEBVIEW_TITLES = exports.WEBVIEW_PANELS = exports.DEFAULTS = exports.VALIDATION_PATTERNS = exports.RETRY_CONFIG = exports.TIME_CONSTANTS = exports.ICONS = exports.CONTEXT_VALUES = exports.COMMANDS = exports.STATE_KEYS = exports.AWS_CONFIG = exports.AWS_ENV_VARS = exports.SIZE_UNITS = exports.FILE_CONSTANTS = exports.UI_CONSTANTS = exports.SEARCH_CONSTANTS = exports.S3_CONSTANTS = void 0;
exports.isValidDeleteConfirmation = isValidDeleteConfirmation;
/**
 * AWS S3 related constants
 */
exports.S3_CONSTANTS = {
    /** Maximum number of keys to fetch per S3 ListObjects request */
    MAX_KEYS_PER_REQUEST: 100,
    /** Default region for S3 operations */
    DEFAULT_REGION: 'us-east-1',
    /** S3 URI scheme */
    URI_SCHEME: 's3://',
    /** S3 HTTPS URL base */
    HTTPS_URL_BASE: 'https://',
    /** S3 URL suffix */
    URL_SUFFIX: '.s3.amazonaws.com/',
    /** ARN prefix */
    ARN_PREFIX: 'arn:aws:s3:::',
    /** Folder delimiter */
    FOLDER_DELIMITER: '/',
    /** Root folder key */
    ROOT_FOLDER_KEY: '',
};
/**
 * Search and pagination constants
 */
exports.SEARCH_CONSTANTS = {
    /** Default maximum number of search results */
    DEFAULT_MAX_RESULTS: 100,
    /** Maximum search depth for recursive operations */
    MAX_SEARCH_DEPTH: 10,
};
/**
 * UI related constants
 */
exports.UI_CONSTANTS = {
    /** Output channel name for general output */
    OUTPUT_CHANNEL_NAME: 'AwsS3-Extension',
    /** Output channel name for logs */
    LOG_CHANNEL_NAME: 'AwsS3-Log',
    /** Separator for multi-line messages */
    MESSAGE_SEPARATOR: ' | ',
    /** Maximum lines to display in tree view */
    MAX_TREE_VIEW_LINES: 800,
};
/**
 * File operation constants
 */
exports.FILE_CONSTANTS = {
    /** Invalid filename characters regex */
    INVALID_FILENAME_CHARS: /[<>:"/\\|?*\x00-\x1F]/g,
    /** Invalid unicode control characters regex */
    INVALID_UNICODE_CHARS: /[\u{80}-\u{9F}]/gu,
    /** Replacement character for invalid chars */
    REPLACEMENT_CHAR: '_',
    /** File extension separator */
    EXTENSION_SEPARATOR: '.',
};
/**
 * Size units for file size display
 */
exports.SIZE_UNITS = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
/**
 * AWS environment variable names
 */
exports.AWS_ENV_VARS = {
    /** AWS profile environment variable */
    PROFILE: 'AWS_PROFILE',
    /** AWS shared credentials file path */
    CREDENTIALS_PATH: 'AWS_SHARED_CREDENTIALS_FILE',
    /** Home directory environment variables */
    HOME: 'HOME',
    USER_PROFILE: 'USERPROFILE',
    HOME_PATH: 'HOMEPATH',
    HOME_DRIVE: 'HOMEDRIVE',
};
/**
 * AWS configuration file paths
 */
exports.AWS_CONFIG = {
    /** Default credentials file name */
    CREDENTIALS_FILE: 'credentials',
    /** Default config file name */
    CONFIG_FILE: 'config',
    /** AWS config directory */
    CONFIG_DIR: '.aws',
    /** Default home drive for Windows */
    DEFAULT_HOME_DRIVE: 'C:',
};
/**
 * Extension state keys
 */
exports.STATE_KEYS = {
    AWS_PROFILE: 'AwsProfile',
    FILTER_STRING: 'FilterString',
    SHOW_ONLY_FAVORITE: 'ShowOnlyFavorite',
    SHOW_HIDDEN_NODES: 'ShowHiddenNodes',
    BUCKET_LIST: 'BucketList',
    SHORTCUT_LIST: 'ShortcutList',
    VIEW_TYPE: 'ViewType',
    AWS_ENDPOINT: 'AwsEndPoint',
    AWS_REGION: 'AwsRegion',
    BUCKET_PROFILE_LIST: 'BucketProfileList',
};
/**
 * Command names
 */
exports.COMMANDS = {
    REFRESH: 'S3TreeView.Refresh',
    FILTER: 'S3TreeView.Filter',
    SHOW_ONLY_FAVORITE: 'S3TreeView.ShowOnlyFavorite',
    SHOW_HIDDEN_NODES: 'S3TreeView.ShowHiddenNodes',
    ADD_TO_FAV: 'S3TreeView.AddToFav',
    DELETE_FROM_FAV: 'S3TreeView.DeleteFromFav',
    HIDE_NODE: 'S3TreeView.HideNode',
    UNHIDE_NODE: 'S3TreeView.UnHideNode',
    SHOW_ONLY_IN_THIS_PROFILE: 'S3TreeView.ShowOnlyInThisProfile',
    SHOW_IN_ANY_PROFILE: 'S3TreeView.ShowInAnyProfile',
    ADD_BUCKET: 'S3TreeView.AddBucket',
    REMOVE_BUCKET: 'S3TreeView.RemoveBucket',
    GOTO: 'S3TreeView.Goto',
    REMOVE_SHORTCUT: 'S3TreeView.RemoveShortcut',
    ADD_SHORTCUT: 'S3TreeView.AddShortcut',
    COPY_SHORTCUT: 'S3TreeView.CopyShortcut',
    SHOW_S3_EXPLORER: 'S3TreeView.ShowS3Explorer',
    SHOW_S3_SEARCH: 'S3TreeView.ShowS3Search',
    SELECT_AWS_PROFILE: 'S3TreeView.SelectAwsProfile',
    UPDATE_AWS_ENDPOINT: 'S3TreeView.UpdateAwsEndPoint',
    SET_AWS_REGION: 'S3TreeView.SetAwsRegion',
    TEST_AWS_CONNECTION: 'S3TreeView.TestAwsConnection',
};
/**
 * Tree item context values
 */
exports.CONTEXT_VALUES = {
    BUCKET: 'Bucket',
    SHORTCUT: 'Shortcut',
    FAV: 'Fav',
    NOT_FAV: '!Fav',
    HIDDEN: 'Hidden',
    NOT_HIDDEN: '!Hidden',
    PROFILE: 'Profile',
    NO_PROFILE: 'NoProfile',
};
/**
 * Icon names
 */
exports.ICONS = {
    PACKAGE: 'package',
    FILE_SYMLINK_DIRECTORY: 'file-symlink-directory',
    CIRCLE_OUTLINE: 'circle-outline',
    REFRESH: 'refresh',
    FILTER: 'filter',
    BOOKMARK: 'bookmark',
    EYE_CLOSED: 'eye-closed',
    ADD: 'add',
    PREVIEW: 'preview',
    SEARCH: 'search',
    ACCOUNT: 'account',
};
/**
 * Time constants
 */
exports.TIME_CONSTANTS = {
    /** Milliseconds in a second */
    MS_PER_SECOND: 1000,
    /** Seconds in a minute */
    SECONDS_PER_MINUTE: 60,
    /** Minutes in an hour */
    MINUTES_PER_HOUR: 60,
};
/**
 * Retry configuration
 */
exports.RETRY_CONFIG = {
    /** Maximum number of retry attempts */
    MAX_RETRIES: 3,
    /** Initial retry delay in milliseconds */
    INITIAL_DELAY_MS: 1000,
    /** Backoff multiplier */
    BACKOFF_MULTIPLIER: 2,
    /** Maximum delay in milliseconds */
    MAX_DELAY_MS: 10000,
};
/**
 * Validation patterns
 */
exports.VALIDATION_PATTERNS = {
    /** Date format YYYY-MM-DD */
    DATE_FORMAT: /^\d{4}-\d{2}-\d{2}$/,
};
/**
 * Default values
 */
exports.DEFAULTS = {
    /** Default AWS profile name */
    AWS_PROFILE: 'default',
    /** Default filter string */
    FILTER_STRING: '',
    /** Default show only favorite */
    SHOW_ONLY_FAVORITE: false,
    /** Default show hidden nodes */
    SHOW_HIDDEN_NODES: false,
};
/**
 * Webview panel IDs
 */
exports.WEBVIEW_PANELS = {
    S3_EXPLORER: 'S3Explorer',
    S3_SEARCH: 'S3Search',
};
/**
 * Webview panel titles
 */
exports.WEBVIEW_TITLES = {
    S3_EXPLORER: 'S3 Explorer',
    S3_SEARCH: 'S3 Search',
};
/**
 * User confirmation strings
 */
exports.CONFIRMATIONS = {
    DELETE: ['delete', 'd'],
};
/**
 * Type guard to check if a value is a valid confirmation
 */
function isValidDeleteConfirmation(value) {
    return exports.CONFIRMATIONS.DELETE.includes(value.toLowerCase());
}
//# sourceMappingURL=Constants.js.map