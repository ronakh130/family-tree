
import './Tree.css';
import { ReactDiagram } from 'gojs-react';
import { initDiagram } from '../../utils/initDiagram';

export const Tree = () => {
  return <ReactDiagram initDiagram={initDiagram} divClassName='diagram-component' />;
};
