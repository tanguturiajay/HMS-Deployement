const Node = require("../models/Nodes");

// In memory map of node path to allowed designations that is lazily loaded and dropped on any node mutation so changes apply next request
let cache = null;

const load = async () => {
    const nodes = await Node.find({}).select("path allowedDesignations -_id");
    cache = new Map(nodes.map((node) => [node.path, node.allowedDesignations]));
    return cache;
};

// Allowed designations for a node path, or null when no node owns that path
const getAllowedDesignations = async (path) => {
    if (!cache) {
        await load();
    }
    return cache.get(path) ?? null;
};

// Called after any node create/update/delete so the next lookup reloads
const invalidate = () => {
    cache = null;
};

module.exports = { getAllowedDesignations, invalidate };
