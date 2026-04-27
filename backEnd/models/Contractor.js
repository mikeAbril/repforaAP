import { Schema, model } from "mongoose";

const contractorSchema = new Schema(
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
        eps: {
            type: String,
            required: [true, "La EPS es obligatoria"],
            trim: true,
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

// Índice compuesto único: no puede haber dos contratistas con el mismo tipo + número de documento
contractorSchema.index({ documentType: 1, documentNumber: 1 }, { unique: true });

const Contractor = model("Contractor", contractorSchema);

export default Contractor;
