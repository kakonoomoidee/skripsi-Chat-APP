const IdentityRegistry = artifacts.require("IdentityRegistry");

module.exports = function (deployer) {
  deployer.deploy(IdentityRegistry).then(() => {});
};
