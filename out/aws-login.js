"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultProvider = void 0;
const credential_provider_node_1 = require("@aws-sdk/credential-provider-node");
function getDefaultProvider() {
    const provider = (0, credential_provider_node_1.defaultProvider)();
    return provider.name;
}
exports.getDefaultProvider = getDefaultProvider;
//# sourceMappingURL=aws-login.js.map