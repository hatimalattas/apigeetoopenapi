import fs from 'fs';
import xml2js from 'xml2js';

/**
 * XML Loader utility for loading and parsing XML files
 */
export class XMLLoader {
  constructor() {
    this.parser = new xml2js.Parser();
  }

  /**
   * Load and parse XML file
   * @param {string} filePath - Path to XML file
   * @returns {Promise<Object>} Parsed XML object
   */
  async loadXMLDoc(filePath) {
    return new Promise((resolve, reject) => {
      try {
        const fileData = fs.readFileSync(filePath, 'utf-8');
        this.parser.parseString(fileData, (err, result) => {
          if (err) {
            reject(new Error(`Failed to parse XML file ${filePath}: ${err.message}`));
          } else {
            resolve(result);
          }
        });
      } catch (ex) {
        reject(new Error(`Failed to read XML file ${filePath}: ${ex.message}`));
      }
    });
  }

  /**
   * Find main XML file in directory
   * @param {string} location - Directory path
   * @param {string} preferredName - Preferred filename (without extension)
   * @returns {string} XML filename
   */
  findMainXmlFile(location, preferredName) {
    try {
      const xmlFiles = fs.readdirSync(location).filter(file => file.endsWith('.xml'));
      if (xmlFiles.length === 0) {
        throw new Error('No XML files found in apiproxy directory');
      }
      // Use the first XML file found, or prioritize one that matches the name if it exists
      return xmlFiles.find(file => file === preferredName + '.xml') || xmlFiles[0];
    } catch (error) {
      throw new Error(`Failed to find main XML file: ${error.message}`);
    }
  }
}