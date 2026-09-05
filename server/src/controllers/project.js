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
        const userId = Number(req.userId);

        const projects = await prisma.project.findMany({
            where: {
                OR: [
                    {
                        ownerId: userId
                    },
                    {
                        members: {
                            some: {
                                userId: userId
                            }
                        }
                    }
                ]
            },
            include: {
                members: {
                    where: {
                        userId: userId
                    },
                    select: {
                        role: true
                    }
                }
            },
            orderBy: {
                createdAt: "desc"
            }
        });

        const formattedProjects = projects.map((project) => {

            let role = "MEMBER";

            if (project.ownerId === userId) {
                role = "OWNER";
            } else if (project.members.length > 0) {
                role = project.members[0].role;
            }

            return {
                id: project.id,
                name: project.name,
                description: project.description,
                ownerId: project.ownerId,
                role
            };
        });

        return res.status(200).json({
            projects: formattedProjects
        });

    } catch (error) {
        console.error("Get projects error:", error);

        return res.status(500).json({
            message: "Failed to fetch projects"
        });
    }
};

module.exports.getProject = async (req, res) => {
    try {
        const projectId = Number(req.params.id);
        const userId = Number(req.userId);

        if (!projectId) {
            return res.status(400).json({
                message: "Invalid project ID",
            });
        }

        const project = await prisma.project.findFirst({
            where: {
                id: projectId,

                OR: [
                    {
                        ownerId: userId,
                    },
                    {
                        members: {
                            some: {
                                userId: userId,
                            },
                        },
                    },
                ],
            },
            include: {
                members: {
                    where: {
                        userId: userId,
                    },
                    select: {
                        role: true,
                    },
                },
            },
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }

        let role = "MEMBER";

        if (project.ownerId === userId) {
            role = "OWNER";
        } else if (project.members.length > 0) {
            role = project.members[0].role;
        }

        return res.status(200).json({
            project: {
                id: project.id,
                name: project.name,
                description: project.description,
                ownerId: project.ownerId,
                role,
            },
        });

    } catch (error) {
        console.error("Get project error:", error);

        return res.status(500).json({
            message: "Failed to fetch project",
        });
    }
};

module.exports.updateProject = async (req, res) => {
    try {
        const { name, description } = req.body;
        const project = await prisma.project.findFirst({
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

module.exports.joinProject = async (req, res) => {
    try {
        const projectId = Number(req.params.id);
        const userId = Number(req.userId);

        if (!projectId) {
            return res.status(400).json({
                message: "Invalid project ID",
            });
        }


        const project = await prisma.project.findUnique({
            where: {
                id: projectId,
            },
        });

        if (!project) {
            return res.status(404).json({
                message: "Project not found",
            });
        }
        if (project.ownerId === userId) {
            return res.status(409).json({
                message: "You are already the owner of this project",
            });
        }


        const existingMember =
            await prisma.projectMember.findUnique({
                where: {
                    userId_projectId: {
                        userId,
                        projectId,
                    },
                },
            });

        if (existingMember) {
            return res.status(409).json({
                message: "You are already a member of this project",
            });
        }


        const member =
            await prisma.projectMember.create({
                data: {
                    projectId,
                    userId,
                    role: "MEMBER",
                },
            });

        return res.status(201).json({
            message: "Successfully joined project",
            member,
        });

    } catch (error) {
        console.error("Join project error:", error);

        return res.status(500).json({
            message: "Failed to join project",
        });
    }
};

