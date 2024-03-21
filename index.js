const FindStale = require('./lib/find-stale.js');
const utils = require('./lib/utils.js');

const argv = require('minimist')(process.argv, {
  string: 'remote',
  boolean: ['prune', 'force'],
  alias: { p: "prune", f: "force", r: "remote" },
  'default': {
    'remote': 'origin',
    'force': false
  }
});

const options = ['prune', 'p', 'force', 'f', 'remote', 'r', '_'];
const hasInvalidParams = Object.keys(argv).some(name => options.indexOf(name) == -1);

(async () => {
  if (hasInvalidParams) {
    console.info('Usage: git removed-branches [-p|--prune] [-f|--force] [-r|--remote <remote>]');
    return
  }

  const remoteName = argv.remote;
  const obj = new FindStale({
    remove: argv.prune,
    force: argv.force,
    remote: remoteName,
  });

  try {
    // Fetching the latest information from the remote
    await utils.exec(["git", "fetch", remoteName]);

    // Getting local branches
    const localBranches = await utils.exec([
      "git",
      "for-each-ref",
      "--format=%(refname:short)",
      "refs/heads/",
    ]);

    // Getting remote branches
    const remoteBranches = await utils.exec([
      "git",
      "for-each-ref",
      "--format=%(refname:short)",
      `refs/remotes/${remoteName}/`,
    ]);

    // Check for stale branches
    const staleBranches = localBranches
      .filter((localBranch) => {
        // Checking if the local branch doesn"t have a corresponding remote branch
        const correspondingRemoteBranch = localBranch.replace(
          "refs/heads/",
          `refs/remotes/${remoteName}/`
        );
        return !remoteBranches.includes(correspondingRemoteBranch);
      })
      .map((branch) => branch.replace("refs/heads/", ""));

    if (staleBranches.length > 0) {
      console.log(
        `The following local branches are stale and can be removed: ${staleBranches.join(
          ", "
        )}`
      );
      if (argv.prune) {
        console.log("Pruning stale branches...");
        // You can implement the branch removal logic here if argv.prune is true
      }
    } else {
      console.log("No stale branches found.");
    }
  } catch (err) {
    process.stderr.write(err.stack + '\r\n');
    process.exit(1);
  }
})();
