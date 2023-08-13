const express = require("express");
const router = express.Router();

// Importando os metodos do controlador do jobs
const {
    getJobs,
    getJob,
    newJob,
    getJobsInRadius,
    updateJob,
    deleteJob,
    jobStats,
    applyJob
} = require("../controllers/jobsController");

const { isAuthenticatedUser, authorizeRoles } = require("../middlewares/auth");

router.route("/jobs").get(getJobs);
router.route("/job/:id/:slug").get(getJob);
router.route("/jobs/:zipcode/:distance").get(getJobsInRadius);

router.route("/stats/:topic").get(jobStats);

router
    .route("/job/new")
    .post(isAuthenticatedUser, authorizeRoles("employer", "admin"), newJob);

router
    .route("/job/:id/apply")
    .put(isAuthenticatedUser, authorizeRoles("user"), applyJob);

router
    .route("/job/:id")
    .put(isAuthenticatedUser, updateJob)
    .delete(isAuthenticatedUser, deleteJob);

module.exports = router;
