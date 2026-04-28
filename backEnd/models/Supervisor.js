import { Schema, model } from "mongoose";

const supervisorSchema = new Schema(
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
        name: {
            type: String,
            required: [true, "El nombre es obligatorio"],
            trim: true,
        },
        email: {
            type: String,
            required: [true, "El correo es obligatorio"],
            trim: true,
            unique: true,
            match: [/.+\@.+\..+/, "Por favor ingresa un correo válido"],
        },
        password: {
            type: String,
            required: [true, "La contraseña es obligatoria"],
        },
        apiKey: {
            type: String,
            default: null,
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Índice compuesto único: no puede haber dos supervisores con el mismo tipo + número de documento
supervisorSchema.index({ documentType: 1, documentNumber: 1 }, { unique: true });


const Supervisor = model("Supervisor", supervisorSchema);

export default Supervisor;
