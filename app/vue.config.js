module.exports = {
  runtimeCompiler: true,
  publicPath: "/",
  devServer: {
    // workaround for https://github.com/vuejs/vue-cli/issues/4557#issuecomment-596272497
    progress: false,
  },
}
