const path = require('path')

module.exports = {
  runtimeCompiler: true,
  publicPath: "/",
  devServer: {
    // workaround for https://github.com/vuejs/vue-cli/issues/4557#issuecomment-596272497
    progress: false,
  },
  // workaround "Error: error while parsing tsconfig.json"
  // (occurring when ts-loader have to compile shared/*.ts and not finding any tsconfig.json)
  chainWebpack: config => {
    config.module.rule('ts').use('ts-loader').tap(options => (
        { ...options, configFile: path.resolve(__dirname, 'tsconfig.json') }
    ))
  }
}
