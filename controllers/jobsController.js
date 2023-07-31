const Job = require("../models/jobs");

const geoCoder = require("../utils/geocoder");

// Pega todos os jovs => /api/v1/jobs
exports.getJobs = async (req, res, next) => {
    const jobs = await Job.find();

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
};

//Criar um novo job => /api/v1/job/new
exports.newJob = async (req, res, next) => {
    const job = await Job.create(req.body);

    res.status(200).json({
        success: true,
        message: "Job is created",
        data: job
    });
};

// Pegar um único job com id e slug => /api/v1/job/:id/:slug
exports.getJob = async (req, res, next) => {
    const job = await Job.find({
        $and: [{ _id: req.params.id }, { slug: req.params.slug }]
    });

    if (!job || job.length === 0) {
        return res.status(404).json({
            success: false,
            message: "Job not found"
        });
    }

    res.status(200).json({
        success: true,
        data: job
    });
};

// Atualizar um job => /api/v1/job/:id
exports.updateJob = async (req, res, next) => {
    let job = await Job.findById(req.params.id);

    if (!job) {
        return res.status(404).json({
            success: false,
            message: "Job not found"
        });
    }

    job = await Job.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
    });

    res.status(200).json({
        success: true,
        message: "Job is updated",
        data: job
    });
};

// Deletar um job => /api/v1/job/:id
exports.deleteJob = async (req, res, next) => {
    const job = await Job.findById(req.params.id);

    if (!job) {
        return res.status(404).json({
            success: false,
            message: "Job not found"
        });
    }

    await Job.findByIdAndDelete(req.params.id);

    res.status(200).json({
        success: true,
        message: "Job is deleted",
        data: {}
    });
};

// Procurar um job por região => /api/v1/jobs/:zipcode/:distance
exports.getJobsInRadius = async (req, res, next) => {
    const { zipcode, distance } = req.params;

    // Pegar a longitude e latitude do zipcode usando o geocoder
    const loc = await geoCoder.geocode(zipcode);
    const latitude = loc[0].latitude;
    const longitude = loc[0].longitude;

    const radius = distance / 3963.2;

    const jobs = await Job.find({
        location: {
            $geoWithin: { $centerSphere: [[longitude, latitude], radius] }
        }
    });

    res.status(200).json({
        success: true,
        results: jobs.length,
        data: jobs
    });
};

// Pegar status sobre um job => /api/v1/stats/:topic
exports.jobStats = async (req, res, next) => {
    const stats = await Job.aggregate([
        {
            $match: { $text: { $search: '"' + req.params.topic + '"' } }
        },
        {
            $group: {
                _id: { $toUpper: "$experience" },
                totalJobs: { $sum: 1 },
                avgPosition: { $avg: "$positions" },
                avgSalary: { $avg: "$salary" },
                minSalary: { $min: "$salary" },
                maxSalary: { $max: "$salary" }
            }
        }
    ]);

    if (stats.length === 0) {
        return res.status(200).json({
            success: false,
            message: `No stats found for - ${req.params.topic}`
        });
    }

    res.status(200).json({
        success: true,
        data: stats
    });
};
