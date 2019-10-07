let semver = require("semver");
let homeDir = require("os").homedir();
let readFileSync = require("fs").readFileSync;

let packageJSON = {};
let deployJSON = {};
let dockerSettings = {};
try {
    packageJSON = JSON.parse(readFileSync("./package.json"));
    dockerSettings = packageJSON["docker"] || {};
} catch (error) {
    console.error("Cannot parse 'package.json' file");
    process.exit(1);
}
try {
    deployJSON = JSON.parse(readFileSync(homeDir + "/.dockerconfig"));
    dockerSettings = Object.assign(dockerSettings, deployJSON);
} catch (error) {}

let options = {
    replacePattern: (
        process.env["DOCKER_REPLACE_PATTERN"] ||
        dockerSettings["replacePattern"]
    ),
    replacement: (
        process.env["DOCKER_REPLACEMENT"] ||
        dockerSettings["replacement"]
    )
};

let execSync = command => {
    require("child_process").execSync(command, {
        stdio: [
            process.stdin, process.stdout, process.stderr
        ]
    });
};
if (dockerSettings["test"]) {
    execSync = command => console.log(command);
}

let version = {
    major: semver.major(packageJSON["version"]),
    minor: semver.minor(packageJSON["version"]),
    patch: semver.patch(packageJSON["version"])
};

let name = packageJSON["name"];
let matches = {
    0: name
};
if (options.replacePattern) {
    let pattern = new RegExp(options.replacePattern, "g");
    matches = pattern.exec(name) || matches;
}

if (options.replacement) {
    name = options.replacement.replace(/\$(\w+)/gm,
        (all, index) => {
            try {
                return matches[parseInt(index)] || `\$${index}`;
            } catch (e) {
                return matches[index] || `\$${index}`;
            }
        }
    );
}

let currentDate = new Date();
let timestamp = `${
    currentDate.getFullYear()
}${
    ("0" + (currentDate.getMonth() + 1)).slice(-2)
}${
    ("0" + currentDate.getDate()).slice(-2)
}${
    ("0" + currentDate.getHours()).slice(-2)
}${
    ("0" + currentDate.getMinutes()).slice(-2)
}${
    ("0" + currentDate.getSeconds()).slice(-2)
}`;

let tags = [];
[
    packageJSON["version"],
    `${version.major}.${version.minor}.${version.patch}-build.${timestamp}`,
    `${version.major}.${version.minor}.${version.patch}`,
    `${version.major}.${version.minor}`,
    `${version.major}`,
    "latest"
].forEach(tag => {
    if (tags.indexOf(tag) >= 0) {
        return;
    }
    tags.push(tag);
});

let baseCommand = (
    process.env["DOCKER_EXECUTABLE"] ||
    dockerSettings["executable"] ||
    "docker"
);

execSync(`${ baseCommand } build ${ tags.map(tag => {
    return `-t ${ name }:${ tag }`;
}).join(" ") } .`);

tags.forEach(tag => {
    execSync(`${ baseCommand } push ${ name }:${ tag }`);
    execSync(`${ baseCommand } rmi ${ name }:${ tag }`);
});
