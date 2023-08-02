const mongoose = require("mongoose");
const validator = require("validator");
const slugify = require("slugify");
const geoCoder = require("../utils/geocoder");

const jobSchema = new mongoose.Schema({
    title: {
        type: String,
        required: [true, "Please enter Job title"],
        trim: true,
        maxLength: [100, "Job title cannot exceed 100 characters"]
    },
    slug: String,
    description: {
        type: String,
        required: [true, "Please enter Job description"],
        maxLength: [1000, "Job description cannot exceed 1000 characters"]
    },
    email: {
        type: String,
        validate: [validator.isEmail, "Please enter valid email address"]
    },
    address: {
        type: String,
        required: [true, "Please enter Job address"]
    },
    location: {
        type: {
            type: String,
            enum: ["Point"]
        },
        coordinates: {
            type: [Number],
            index: "2dsphere"
        },
        formattedAddress: String,
        city: String,
        state: String,
        zipcode: String,
        country: String
    },
    company: {
        type: String,
        required: [true, "Please enter Job company name"]
    },
    industry: {
        type: [String],
        required: [true, "Please select industry for this job"],
        enum: {
            values: [
                "Business",
                "Information Technology",
                "Banking",
                "Education",
                "Telecommunication",
                "Others"
            ],
            message: "Please select correct options for industry"
        }
    },
    jobType: {
        type: String,
        required: [true, "Please select job type for this job"],
        enum: {
            values: ["Permanent", "Temporary", "Internship"],
            message: "Please select correct options for job type"
        }
    },
    minEducation: {
        type: String,
        required: [true, "Please select min education for this job"],
        enum: {
            values: ["Bachelors", "Masters", "Phd"],
            message: "Please select correct options for education"
        }
    },
    positions: {
        type: Number,
        default: 1
    },
    experience: {
        type: String,
        required: [true, "Please select experience level for this job"],
        enum: {
            values: [
                "No Experience",
                "1 Year - 2 Years",
                "2 Years - 5 Years",
                "5 Years+"
            ],
            message: "Please select correct options for experience"
        }
    },
    salary: {
        type: Number,
        required: [true, "Please enter expected salary for this job"],
        maxLength: [10, "Salary cannot exceed 10 characters"]
    },
    postingDate: {
        type: Date,
        default: Date.now
    },
    lastDate: {
        type: Date,
        default: new Date().setDate(new Date().getDate() + 7)
    },
    applicantsApplied: {
        type: [Object],
        select: false
    }
});

// Criando um slug para cada job antes de salvar
jobSchema.pre("save", function (next) {
    this.slug = slugify(this.title, { lower: true });

    next();
});

// Configurando o local do job usando o geocoder
jobSchema.pre("save", async function (next) {
    const loc = await geoCoder.geocode(this.address);

    this.location = {
        type: "Point",
        coordinates: [loc[0].longitude, loc[0].latitude],
        formattedAddress: loc[0].formattedAddress,
        city: loc[0].city,
        state: loc[0].stateCode,
        zipcode: loc[0].zipcode,
        country: loc[0].countryCode
    };

    // Não salvar o endereço no banco de dados
    // this.address = undefined;

    // next();
});

module.exports = mongoose.model("Job", jobSchema);
