module.exports = {
  runtimeCompiler: true,
  publicPath: "/",
  // workaround for https://github.com/vuejs/vue-cli/issues/3898
  chainWebpack: config => {
    config.resolve.extensions.prepend('.ts')
  },
}
