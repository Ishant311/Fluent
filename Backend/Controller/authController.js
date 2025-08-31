const jwt = require("jsonwebtoken");
const { hashPassword, comparePassword } = require("../utils/encryptPassword");
const dotenv = require("dotenv");
const userModel = require("../Model/userModel");

dotenv.config();

const signup = async (req, res) => {
  const { email, name, password } = req.body;
  if (!email || !name || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existingUser = await userModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }
    const hashedPassword = await hashPassword(password);
    const newUser = new userModel({ email, name, password: hashedPassword });
    await newUser.save();
    const token = jwt.sign({id:newUser._id},process.env.JWT_SECRET,{
        expiresIn: "1h"
    })
    res.cookie("authToken",token,{
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict"
    });
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const signin = async (req,res)=>{
   const { email, password } = req.body;

   if (!email || !password) {
     return res.status(400).json({ error: "All fields are required" });
   }

   try {
     const user = await userModel.findOne({ email });
     if (!user) {
       return res.status(404).json({ error: "User not found" });
     }

     const isMatch = await comparePassword(password, user.password);
     if (!isMatch) {
       return res.status(401).json({ error: "Invalid credentials" });
     }

     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
       expiresIn: "1h",
     });

     res.cookie("authToken", token, {
       httpOnly: true,
       secure: process.env.NODE_ENV === "production",
       sameSite: "strict"
     });
     res.status(200).json({ message: "User signed in successfully" });
   } catch (error) {
     res.status(500).json({ error: "Internal server error" });
   }
};

module.exports = {
  signup,
  signin
};
