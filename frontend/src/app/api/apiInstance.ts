import axios from "axios";
import {BACKEND} from "../config/apiConfig";

export const apiInstance = axios.create({
    baseURL: BACKEND,
})