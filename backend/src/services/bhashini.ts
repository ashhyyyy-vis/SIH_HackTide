import axios from 'axios';

interface BhashiniPipelineResponse {
  pipelineInferenceAPI: string;
  pipelineResponseConfig: {
      [key: string]: any;
  };
}

interface TranslationRequest {
  text: string;
  sourceLanguage: string;
  targetLanguage: string;
}

interface TranslationResponse {
  output: string[];
  sourceLanguage: string;
  targetLanguage: string;
}

class BhashiniService {
  private userId: string;
  private ulcaApiKey: string;
  private inferenceApiKey: string;
  private pipelineCache: Map<string, string> = new Map();

  constructor() {
    this.userId = process.env.BHASHINI_USER_ID || '';
    this.ulcaApiKey = process.env.BHASHINI_ULCA_API_KEY || '';
    this.inferenceApiKey = process.env.BHASHINI_INFERENCE_API_KEY || '';

    if (!this.userId || !this.ulcaApiKey || !this.inferenceApiKey) {
      console.warn('Bhashini API credentials not configured. Translation features will be disabled.');
    }
  }

  private getLanguageCode(lang: string): string {
    const languageMap: { [key: string]: string } = {
      'en': 'en',
      'hi': 'hi',
      'ta': 'ta',
      'te': 'te',
      'mr': 'mr',
      'bn': 'bn',
      'gu': 'gu',
      'kn': 'kn',
      'ml': 'ml',
      'or': 'or',
      'pa': 'pa'
    };
    return languageMap[lang] || 'en';
  }

  private async discoverPipeline(sourceLanguage: string, targetLanguage: string): Promise<string> {
    const cacheKey = `${sourceLanguage}-${targetLanguage}`;
    
    if (this.pipelineCache.has(cacheKey)) {
      return this.pipelineCache.get(cacheKey)!;
    }

    try {
      const response = await axios.post<BhashiniPipelineResponse>(
        'https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline',
        {
          pipelineTasks: [
            {
              taskType: 'translation',
              config: {
                language: {
                  sourceLanguage,
                  targetLanguage
                }
              }
            }
          ],
          pipelineRequestConfig: {
            pipelineId: '64392f96daac500b55c543cd'
          }
        },
          {
            headers: {
              'Authorization': this.ulcaApiKey,
              'Content-Type': 'application/json'
            }
          }
      );

      const pipelineUrl = response.data.pipelineInferenceAPI;
      this.pipelineCache.set(cacheKey, pipelineUrl);
      return pipelineUrl;
    } catch (error) {
      console.error('Error discovering Bhashini pipeline:', error);
      throw new Error('Failed to discover translation pipeline');
    }
  }

  async translateText(text: string, targetLanguage: string, sourceLanguage: string = 'en'): Promise<string> {
    if (!this.userId || !this.ulcaApiKey || !this.inferenceApiKey) {
      console.warn('Bhashini credentials not configured, returning original text');
      return text;
    }

    const sourceLangCode = this.getLanguageCode(sourceLanguage);
    const targetLangCode = this.getLanguageCode(targetLanguage);

    if (sourceLangCode === targetLangCode) {
      return text;
    }

    try {
      const pipelineUrl = await this.discoverPipeline(sourceLangCode, targetLangCode);

      const response = await axios.post<TranslationResponse>(
        pipelineUrl,
        {
          input: [
            {
              source: text
            }
          ],
          config: {
            language: {
              sourceLanguage: sourceLangCode,
              targetLanguage: targetLangCode
            }
          }
        },
        {
          headers: {
            'Authorization': this.inferenceApiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.output && response.data.output.length > 0) {
        return response.data.output[0].target;
      }

      return text;
    } catch (error) {
      console.error('Error translating text:', error);
      return text;
    }
  }

  async translateBatch(texts: string[], targetLanguage: string, sourceLanguage: string = 'en'): Promise<string[]> {
    const translations = await Promise.all(
      texts.map(text => this.translateText(text, targetLanguage, sourceLanguage))
    );
    return translations;
  }
}

export default new BhashiniService();
