"use client";

import { useState, useEffect } from "react";
import { ListObjectsV2Command, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import s3Client from "./API/aws-config";
import styles from "./page.module.css";

const Page = () => {
  const [shownData, setShownData] = useState([]);
  const [ip, setIp] = useState(""); // Store IP to check if we need to re-fetch
  const [selectedFile, setSelectedFile] = useState(null); // Store the selected file
  const [isUploading, setIsUploading] = useState(false); // Track upload state
  const [textInput, setTextInput] = useState(""); // Store the text input

  // Function for fetch IP
  const fetchIP = async () => {
    try {
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip.replace(/\./g, "-") + "/";
    } catch (error) {
      console.error("Error fetching IP:", error);
      return null;
    }
  };

  // Function for fetch Data
  const fetchData = async (ip) => {
    try {
      const params = {
        Bucket: "afs-checking",
        Prefix: ip, // Fetching specific folder based on IP
      };

      const command = new ListObjectsV2Command(params);
      const data = await s3Client.send(command);

      if (data && data.Contents) {
        const fileKeys = data.Contents.map((item) => item.Key);
        return fileKeys;
      }

    } catch (error) {
      console.error("Error fetching data from S3:", error);
    }
  };

  // Function to handle file upload to S3
  const handleFileUpload = async () => {
    if (!selectedFile) return; // Exit if no file is selected

    setIsUploading(true);

    try {
      const uploadParams = {
        Bucket: "afs-checking",
        Key: ip + selectedFile.name, // Upload to the folder named by the IP
        Body: selectedFile,
        ContentType: selectedFile.type, // Use the file's MIME type
      };

      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);

      // Refetch the data to show the newly uploaded file
      const updatedData = await fetchData(ip);
      setShownData(updatedData);

      console.log("File uploaded successfully!");

      // // Set a timer to delete the file after 5 minutes (300000 ms)
      // setTimeout(async () => {
      //   await deleteFileFromS3(ip + selectedFile.name);
      // }, 300000); // 5 minutes = 300000 ms

    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setIsUploading(false);
    }
  };

  // Function to handle text upload as .txt file
  const handleTextUpload = async () => {
    if (!textInput) return; // Exit if no text input is provided

    setIsUploading(true);

    try {
      const blob = new Blob([textInput], { type: "text/plain" });
      const fileName = `user-text-${Date.now()}.txt`; // Generate a unique file name

      const uploadParams = {
        Bucket: "afs-checking",
        Key: ip + fileName, // Upload to the folder named by the IP
        Body: blob,
        ContentType: "text/plain",
      };

      const command = new PutObjectCommand(uploadParams);
      await s3Client.send(command);

      // Refetch the data to show the newly uploaded text file
      const updatedData = await fetchData(ip);
      setShownData(updatedData);

      console.log("Text file uploaded successfully!");

      // // Set a timer to delete the file after 5 minutes (300000 ms)
      // setTimeout(async () => {
      //   await deleteFileFromS3(ip + fileName);
      // }, 300000); // 5 minutes = 300000 ms

    } catch (error) {
      console.error("Error uploading text file:", error);
    } finally {
      setIsUploading(false);
      setTextInput(""); // Clear the text input after uploading
    }
  };

  // // Function to delete file from S3
  // const deleteFileFromS3 = async (fileKey) => {
  //   try {
  //     const deleteParams = {
  //       Bucket: "afs-checking",
  //       Key: fileKey, // File key to delete
  //     };

  //     const command = new DeleteObjectCommand(deleteParams);
  //     await s3Client.send(command);

  //     console.log(`File ${fileKey} deleted successfully after 5 minutes.`);

  //     // Refetch the data to remove the deleted file from the UI
  //     const updatedData = await fetchData(ip);
  //     setShownData(updatedData);

  //   } catch (error) {
  //     console.error("Error deleting file:", error);
  //   }
  // };

  // Function for Check and Update Data
  useEffect(() => {
    const main = async () => {
      const ip = await fetchIP();
      console.log(ip);
      
      setIp(ip)
      const data = await fetchData(ip);
      setShownData(data);
      console.log("Data changed");

    };
    main();

    const interval = setInterval(main, 10000); // Poll every 5 seconds
    return () => clearInterval(interval); // Clean up interval on unmount
  }, []);

  // Render file cards based on file extension
  const renderFile = (dataItem) => {
    const fileName = dataItem.split("/").pop();
    const fileExtension = dataItem.split(".").pop();
    const fileUrl = `https://afs-checking.s3.amazonaws.com/${dataItem}`;

    switch (fileExtension) {
      case "jpg":
      case "jpeg":
      case "png":
      case "gif":
        return (
          <div className={styles.card}>
            <h2>{fileName}</h2>
            <img src={fileUrl} alt={fileName} />
          </div>
        );
      case "mp4":
        return (
          <div className={styles.card}>
            <h2>{fileName}</h2>
            <video width="600" controls>
              <source src={fileUrl} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
            <iframe src={fileUrl} width="600" height="400"></iframe>
          </div>
        );
      case "txt":
        return (
          <div className={styles.card}>
            <h2>{fileName}</h2>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              View Text File
            </a>
            <iframe src={fileUrl} width="600" height="400"></iframe>

          </div>
        );
      case "rar":
        return (
          <div className={styles.card}>
            <h2>{fileName}</h2>
            <a href={fileUrl} target="_blank" rel="noopener noreferrer">
              Download RAR File
            </a>
          </div>
        );
      default:
        return (
          <div className={styles.card}>
            <h2>{fileName}</h2>
            <a href={fileUrl} download target="_blank" rel="noopener noreferrer">
              Download File
            </a>
          </div>
        );
    }
  };

  return (
    <div className={styles.container}>
      <h1>S3 Data List</h1>

      {/* Upload Form */}
      <div className={styles.uploadSection}>
        <input
          type="file"
          onChange={(e) => setSelectedFile(e.target.files[0])}
        />
        <button onClick={handleFileUpload} disabled={!selectedFile || isUploading}>
          {isUploading ? "Uploading..." : "Upload File"}
        </button>
      </div>
      
       {/* Text Upload Form */}
      <div className={styles.uploadSection}>
        <textarea
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Enter text to upload as a .txt file"
        />
        <button onClick={handleTextUpload} disabled={!textInput || isUploading}>
          {isUploading ? "Uploading..." : "Upload Text as .txt File"}
        </button>
      </div>

      <div className={styles.cardContainer}>
        {shownData ? (
          <div>
            {shownData.length > 0 ? (
              shownData.map((dataItem, index) => (
                <div key={index}>{renderFile(dataItem)}</div>
              ))
            ) : (
              <div>Loading / There is no data</div>
            )}
          </div>
        ) : (
          <p>There is no folder</p>
        )}
      </div>
    </div>
  );
};

export default Page;