module.exports = class easyConf {
        constructor(defaultConfig={}) {
                this.defaultConfigJson = defaultConfig;
                this.configJson = {};
                this.loDash = require('lodash');
                return this;
        }
        defaults(defaultConfig) {
                this.defaultConfigJson = this.loDash.merge(this.defaultConfigJson, defaultConfig);
                return this;
        }
        file(configFile) {
                const fs = require('fs');
                if(fs.existsSync(configFile)) {
                        var configJson = JSON.parse(fs.readFileSync(configFile));
                        for(const [configKey, configValue] of Object.entries(configJson)) {
                                this.configJson[configKey] = configValue;
                        }
                }
                return this;
        }
        argv() {
                for(var counter=2; counter < process.argv.length; counter++) {
                        if(process.argv[counter].includes('=') && process.argv[counter].split('=') == 2) {
                                var keyValArr = process.argv[counter].split('=');
                                this.configJson[keyValArr[0].replace(/^[-]+/g, '')] = keyValArr[1];
                        }
                }
                return this;
        }
        env() {
                this.loDash.each(process.env, (value, key) => {
                        this.configJson[key] = value;
                })
                return this;
        }
        set(configItemJson) {
                for(const [configKey, configValue] of Object.entries(configItemJson)) {
                        this.configJson[configKey] = configValue;
                }
                return this;
        }
        get(configKey) {
                if(this.configJson[configKey]) {
                        return this.configJson[configKey];
                } else if(this.defaultConfigJson[configKey]) {
                        return this.defaultConfigJson[configKey];
                }
                return null;
        }
        getConfig() {
                return(this.loDash.merge(this.defaulConfigJson, this.configJson));
        }
}
