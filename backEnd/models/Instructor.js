import { Schema, model } from "mongoose";

const instructorSchema = new Schema(
    {
        documentType: {
            type: String,
            required: [true, "El tipo de documento es obligatorio"],
            enum: {
                values: ["CC", "CE", "PA", "TI", "CD", "PE", "PT", "RC", "SC"],
                message: "El tipo de documento '{VALUE}' no es válido. Usa: CC, CE, PA, TI, CD, PE, PT, RC, o SC",
            },
            trim: true,
        },
        documentNumber: {
            type: String,
            required: [true, "El número de documento es obligatorio"],
            trim: true,
        },
        fullName: {
            type: String,
            required: [true, "El nombre completo es obligatorio"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "El correo es obligatorio"],
            trim: true,
            match: [/.+\@.+\..+/, "Por favor ingresa un correo válido"],
        },
        documentIssueDate: {
            type: Date,
            required: false,
        },
        supervisorId: {
            type: Schema.Types.ObjectId,
            ref: "Supervisor",
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

// Índice compuesto único: no puede haber dos instructores con el mismo tipo + número de documento
instructorSchema.index({ documentType: 1, documentNumber: 1 }, { unique: true });

const Instructor = model("Instructor", instructorSchema);

export default Instructor;
