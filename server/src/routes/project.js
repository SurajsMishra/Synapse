const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const projectController = require("../controllers/project");

router.use(authenticate);

router.post("/", projectController.createProject);
router.get("/", projectController.getProjects);
router.get("/:id", projectController.getProject);
router.put("/:id", projectController.updateProject);
router.delete("/:id", projectController.deleteProject);
router.post("/:id/join", projectController.joinProject);

module.exports = router;