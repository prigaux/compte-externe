module.exports = {
  runtimeCompiler: true,
  publicPath: "/",
  chainWebpack: config => {
    // workaround for https://github.com/vuejs/vue-cli/issues/3898
    config.resolve.extensions.prepend('.ts')
    // workaround for https://github.com/vuejs/vue-cli/issues/4557#issuecomment-532805642
    config.plugins.delete('progress')
  },
}
