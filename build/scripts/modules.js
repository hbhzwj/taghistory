/*jslint browser: true, vars:true*/
/*global TH, chrome*/

TH.Modules.I18n = {
    t: function(key, replacements) {
        // default
        var replacements = typeof replacements !== 'undefined' ? b : [];
        if (key instanceof Array) {
            var keys = key;
            var lookup = {};
            var i;
            for(i = 0; i < keys.length; ++i) {
                lookup["i18n_#{key}"] = this.chromeAPI.i18n.getMessage(key.toString());
            }
            return lookup;
        } else {
          return this.chromeAPI.i18n.getMessage(key, replacements);
        }
    }
};