import React, { useState, useEffect } from 'react';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { motion } from 'framer-motion';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import JobFormStep1 from '@/components/JobFormStep1';
import logo from './logo.png';
import axios from 'axios';

function App() {
  const [formData, setFormData] = useState({
    jobTitle: '',
    yearsOfExperience: '',
    jobType: '',
    location: '',
    requiredSkills: '',
    jobDescription: '',
    resumeFile: null,
  });

  const { toast } = useToast();

  // Auto-populate jobDescription and requiredSkills from URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const skills = params.get('skills') || '';
    const jobDesc = params.get('job') || '';

    // Make sure to decode and assign correctly
    setFormData(prev => ({
      ...prev,
      requiredSkills: decodeURIComponent(skills),
      jobDescription: decodeURIComponent(jobDesc),
    }));

    console.log("Auto-populated from URL:", {
      requiredSkills: skills,
      jobDescription: jobDesc,
    });
  }, []);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Helper to strip HTML tags from job description
  const stripHtml = (html) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    // Add space after block elements to keep words separate
    const blockTags = ['p', 'div', 'br', 'li'];
    blockTags.forEach(tag => {
      const elements = div.getElementsByTagName(tag);
      for (let el of elements) {
        el.appendChild(document.createTextNode(' '));
      }
    });
    return div.textContent || div.innerText || '';
  };

  const handleSubmit = async () => {
    if (!formData.jobTitle || !formData.jobType || !formData.jobDescription) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (!formData.resumeFile) {
      toast({
        title: "Missing Resume",
        description: "Please upload a resume before submitting.",
        variant: "destructive"
      });
      return;
    }

    try {
      const form = new FormData();
      const orgIdFromStorage = Number(localStorage.getItem("orgId") || 1);

      const jobPayload = {
        org_id: orgIdFromStorage,
        exe_name: formData.requiredSkills,
        workflow_id: "resume_ranker",
        job_description: stripHtml(formData.jobDescription) || "No description",
      };

      form.append("data", JSON.stringify(jobPayload));

      if (formData.resumeFile instanceof File) {
        form.append("resumes", formData.resumeFile);
      } else if (Array.isArray(formData.resumeFile)) {
        formData.resumeFile.forEach(file => {
          if (file instanceof File) form.append("resumes", file);
        });
      }

      // Send to Agentic AI
      const response = await fetch(
        "https://agentic-ai.co.in/api/agentic-ai/workflow-exe",
        { method: "POST", body: form }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Upload failed with status ${response.status}`);
      }

      console.log("✅ Agentic AI response:", result.data);

      const resumeResults = result.data?.result;
      if (!Array.isArray(resumeResults)) {
        throw new Error("Invalid resume ranking result format from Agentic AI.");
      }

      // Send to ServiceNow
      const servicenowResponse = await axios.post(
        'https://dev187243.service-now.com/api/1763965/resumerankingapi/upload',
        resumeResults,
        {
          auth: {
            username: 'admin',
            password: 'aTw3Prz$PR/7' // ⚠️ Don't hardcode in production
          },
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        }
      );

      console.log("✅ ServiceNow Response:", servicenowResponse.data);

      toast({
        title: "Success!",
        description: "✅ Resume submitted successfully to Agentic AI & ServiceNow.",
      });

    } catch (error) {
      console.error("❌ Upload failed:", error.response?.data || error.message || error);
      toast({
        title: "Upload Failed",
        description: "❌ Something went wrong. Check console for details.",
        variant: "destructive"
      });
    }
  };

  return (
    <HelmetProvider>
      <div className="min-h-screen bg-gradient-to-br from-cyan-350 via-blue-500 to-blue-600 relative overflow-hidden">
        <Helmet>
          <title>Talent Sift - Job Posting Platform</title>
          <meta
            name="description"
            content="Create and post job opportunities with Talent Sift's intuitive job posting platform"
          />
        </Helmet>

        {/* Background animation */}
        <motion.div
          className="absolute inset-0 opacity-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.1 }}
          transition={{ duration: 1 }}
        >
          <div className="absolute top-20 left-20 w-32 h-32 bg-white rounded-full blur-xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-white rounded-full blur-xl animate-pulse delay-500"></div>
          <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-white rounded-full blur-lg animate-pulse delay-1000"></div>
        </motion.div>

        <div className="relative z-10 min-h-screen flex flex-col">
          {/* Logo/Header */}
          <div className="p-8">
            <img src={logo} alt="Talent Sift Logo" className="h-10" />
          </div>

          {/* Job Form */}
          <div className="flex-1 flex items-center justify-center p-4">
            <JobFormStep1
              formData={formData}
              handleInputChange={handleInputChange}
              handleSubmit={handleSubmit}
            />
          </div>

          <Toaster />
        </div>
      </div>
    </HelmetProvider>
  );
}

export default App;
