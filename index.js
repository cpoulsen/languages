const sift = require('sift');
const provinces = require('provinces');
const {ApolloServer, gql} = require('apollo-server');
const { buildFederatedSchema } = require('@apollo/federation');
const {continents, countries, languages} = require('countries-list');

const typeDefs = gql`
  type Continent {
    code: ID!
    name: String!
  }


  type State {
    code: String
    name: String!
  }

  type Language {
    code: ID!
    name: String
    native: String
    rtl: Boolean!
  }

  input StringQueryOperatorInput {
    eq: String
    ne: String
    in: [String]
    nin: [String]
    regex: String
    glob: String
  }

  input ContinentFilterInput {
    code: StringQueryOperatorInput
  }

  input LanguageFilterInput {
    code: StringQueryOperatorInput
  }

  type Query {
    continents(filter: ContinentFilterInput): [Continent!]!
    continent(code: ID!): Continent
    languages(filter: LanguageFilterInput): [Language!]!
    language(code: ID!): Language
  }
`;

function filterToSift(filter = {}) {
  return sift(
    Object.entries(filter).reduce(
      (acc, [key, operators]) => ({
        ...acc,
        [key]: operatorsToSift(operators)
      }),
      {}
    )
  );
}

function operatorsToSift(operators) {
  return Object.entries(operators).reduce(
    (acc, [operator, value]) => ({
      ...acc,
      ['$' + operator]: value
    }),
    {}
  );
}

const resolvers = {
  State: {
    code: state => state.short,
    country: state => countries[state.country]
  },
  Continent: {
    countries: continent =>
      Object.entries(countries)
        .filter(entry => entry[1].continent === continent.code)
        .map(([code, country]) => ({
          ...country,
          code
        }))
  },
  Language: {
    rtl: language => Boolean(language.rtl)
  },
  Query: {
    continent(parent, {code}) {
      const name = continents[code];
      return (
        name && {
          code,
          name
        }
      );
    },
    continents: (parent, {filter}) =>
      Object.entries(continents)
        .map(([code, name]) => ({
          code,
          name
        }))
        .filter(filterToSift(filter)),
    country(parent, {code}) {
      const country = countries[code];
      return (
        country && {
          ...country,
          code
        }
      );
    },
    countries: (parent, {filter}) =>
      Object.entries(countries)
        .map(([code, country]) => ({
          ...country,
          code
        }))
        .filter(filterToSift(filter)),
    language(parent, {code}) {
      const language = languages[code];
      return (
        language && {
          ...language,
          code
        }
      );
    },
    languages: (parent, {filter}) =>
      Object.entries(languages)
        .map(([code, language]) => ({
          ...language,
          code
        }))
        .filter(filterToSift(filter))
  }
};

const server = new ApolloServer({
  schema: buildFederatedSchema([{ typeDefs, resolvers }]),
  introspection: true,
  playground: true,
  engine: {
    apiKey: process.env.ENGINE_API_KEY
  }
});

server.listen({port: process.env.PORT || 4000}).then(({url}) => {
  console.log(`🚀  Server ready at ${url}`);
});
