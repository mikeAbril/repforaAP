import { Schema, model } from "mongoose";

const reportSchema = new Schema(
    {
        contractorId: {
            type: Schema.Types.ObjectId,
            ref: "Contractor",
            required: [true, "El ID del contratista es obligatorio"],
        },
        supervisorId: {
            type: Schema.Types.ObjectId,
            ref: "Supervisor",
            required: [true, "El supervisor es obligatorio para vincular el reporte a su carpeta"],
        },
        platform: {
            type: String,
            required: [true, "La plataforma es obligatoria"],
            enum: {
                values: ["soi", "aportes_en_linea", "asopagos", "mi_planilla"],
                message: "La plataforma '{VALUE}' no es válida. Usa: soi, aportes_en_linea, asopagos o mi_planilla",
            },
        },
        platformData: {
            type: Schema.Types.Mixed,
            required: [true, "Los datos de la plataforma son obligatorios"],
        },
        reportMonth: {
            type: Number,
            required: [true, "El mes del reporte es obligatorio"],
        },
        reportYear: {
            type: Number,
            required: [true, "el año del reporte es obligatorio"],
        },
        status: {
            type: String,
            required: true,
            enum: {
                values: ["pending", "processing", "success", "downloaded", "error"],
                message: "El estado '{VALUE}' no es válido",
            },
            default: "pending",
        },
        errorReason: {
            type: String,
            default: null,
        },
        driveFileId: {
            type: String,
            default: null,
        },
        driveUrl: {
            type: String,
            default: null,
        },
        filePath: {
            type: String,
            default: null,
        },
        attempts: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    }
);

const Report = model("Report", reportSchema);

export default Report;
