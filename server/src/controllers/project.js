const prisma = require("../lib/prisma");
module.exports.createProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name?.trim()) {
            return res.status(400).json({ message: "Project name is required" });
        }
        const project = await prisma.project.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                ownerId: req.userId,
            },
        });
        res.status(201).json({ project });
    } catch (error) {
        console.error("Create project error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


module.exports.getProjects = async (req, res) => {
    try {
        const projects = await prisma.project.findMany({
            where: { ownerId: req.userId },
            orderBy: { updatedAt: "desc" },
        });
        res.status(200).json({ projects });
    } catch (error) {
        console.error("Get projects error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports.getProject = async (req, res) => {
    try {
        const projectId = Number(req.params.id);

        if (!req.params.id || Number.isNaN(projectId)) {
            return res.status(400).json({ message: "Invalid project ID" });
        }

        const project = await prisma.project.findFirst({
            where: { id: projectId, ownerId: req.userId },
        });

        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }

        res.status(200).json({ project });
    } catch (error) {
        console.error("Get project error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

module.exports.updateProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        const project = await  prisma.project.findFirst({
            where: { id: Number(req.params.id), ownerId: req.userId },
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        const updated = await prisma.project.update({
            where: { id: project.id },
            data: {
                ...(name !== undefined && { name: name.trim() }),
                ...(description !== undefined && { description: description?.trim() || null }),
            },
        });
        res.status(200).json({ project: updated });
    } catch (error) {
        console.error("Update project error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};


module.exports.deleteProject = async (req, res) => {
    try {
        const project = await prisma.project.findFirst({
            where: { id: Number(req.params.id), ownerId: req.userId },
        });
        if (!project) {
            return res.status(404).json({ message: "Project not found" });
        }
        await prisma.project.delete({ where: { id: project.id } });
        res.status(200).json({ message: "Project deleted" });
    } catch (error) {
        console.error("Delete project error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};