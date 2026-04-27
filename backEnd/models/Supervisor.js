import { Schema, model } from "mongoose";

const supervisorSchema = new Schema(
    {
        documentNumber: {
            type: String,
            required: [true, "El número de documento es obligatorio"],
            unique: true,
            trim: true,
        },
        password: {
            type: String,
            required: [true, "La contraseña es obligatoria"],
        },
        name: {
            type: String,
            required: [true, "El nombre es obligatorio"],
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

const Supervisor = model("Supervisor", supervisorSchema);

export default Supervisor;
